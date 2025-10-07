// app/checkout/details/actions.ts
"use server";

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import crypto from "node:crypto";
import { requireUser } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

async function getCartWithItems() {
  const store = await cookies();
  const cartId = store.get("cart_id")?.value || "";
  if (!cartId) throw new Error("No cart");

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { CartItem: { include: { Variant: { include: { Product: true } } } } },
  });
  if (!cart || cart.CartItem.length === 0) throw new Error("Empty cart");
  return cart;
}

export async function startCheckout(formData: FormData) {
  const cart = await getCartWithItems();

  const email = String(formData.get("email") || "");
  const shippingName = String(formData.get("shippingName") || "");
  const shippingPhone = String(formData.get("shippingPhone") || "");
  const shippingAddr1 = String(formData.get("shippingAddr1") || "");
  const shippingAddr2 = String(formData.get("shippingAddr2") || "");
  const shippingCity = String(formData.get("shippingCity") || "");
  const shippingPost = String(formData.get("shippingPost") || "");
  const shippingCountry = String(formData.get("shippingCountry") || "GR");
  const paymentMethod = String(formData.get("paymentMethod") || "online");

  // Current user (null for guest)
  const u = await requireUser();
  const customerId = u?.id ?? null;

  // Persist shipping onto Cart
  await prisma.cart.update({
    where: { id: cart.id },
    data: {
      shippingName,
      shippingPhone,
      shippingAddr1,
      shippingAddr2,
      shippingCity,
      shippingPost,
      shippingCountry,
      updatedAt: new Date(),
    },
  });

  // Compute totals
  const subtotalCents = cart.CartItem.reduce(
    (sum, ci) => sum + (ci.unitCents ?? ci.Variant?.priceCents ?? 0) * (ci.quantity ?? 0),
    0
  );
  const currency = (cart.currency ?? "EUR").toUpperCase();

  // CASH ON DELIVERY: create order now and redirect to success
  if (paymentMethod === "cash") {
    const syntheticId = `cash-${crypto.randomUUID()}`;

    const order = await prisma.order.create({
      data: {
        customerId,                // associate if signed in, else null
        email,                     // always store email
        paymentStatus: "UNPAID",
        currency,
        subtotalCents,
        taxCents: 0,
        shippingCents: 0,
        totalCents: subtotalCents,
        shippingName,
        shippingPhone,
        shippingAddr1,
        shippingAddr2,
        shippingCity,
        shippingPost,
        shippingCountry,
        status: "PENDING",
        stripeSessionId: syntheticId, // placeholder id for reference
        orderItems: {
          create: cart.CartItem.map((ci) => ({
            variantId: ci.variantId,
            title:
              (ci.Variant?.Product?.title ?? "Product") +
              (ci.Variant?.title ? " — " + ci.Variant.title : ""),
            sku: ci.Variant?.sku ?? "",
            quantity: ci.quantity,
            unitCents: ci.unitCents ?? ci.Variant?.priceCents ?? 0,
            vatRate: ci.Variant?.vatRate ?? 24,
          })),
        },
      },
      include: { orderItems: true },
    });

    // Optionally clear cart here if desired
    redirect(`/checkout/success?session_id=${encodeURIComponent(syntheticId)}`);
    return;
  }

  // CARD (ONLINE): Stripe Checkout
  const line_items = cart.CartItem.map((ci) => ({
    price_data: {
      currency: currency.toLowerCase(),
      product_data: {
        name:
          (ci.Variant?.Product?.title ?? "Product") +
          (ci.Variant?.title ? " — " + ci.Variant.title : ""),
      },
      unit_amount: ci.unitCents ?? ci.Variant?.priceCents ?? 0,
    },
    quantity: ci.quantity,
  }));

  const base = requiredEnv("NEXT_PUBLIC_BASE_URL");

  // 1) Try to reuse an existing Customer
  let customer: Stripe.Customer | null = null;
  if (email) {
    const existing = await stripe.customers.list({ email, limit: 1 });
    customer = existing.data[0] ?? null;
  }

  // 2) Ensure Customer has current shipping/billing
  if (!customer) {
    customer = await stripe.customers.create({
      email: email || undefined,
      name: shippingName || undefined,
      phone: shippingPhone || undefined,
      address: {
        line1: shippingAddr1 || undefined,
        line2: shippingAddr2 || undefined,
        city: shippingCity || undefined,
        postal_code: shippingPost || undefined,
        country: shippingCountry || undefined,
      },
      shipping: {
        name: shippingName || undefined,
        phone: shippingPhone || undefined,
        address: {
          line1: shippingAddr1 || undefined,
          line2: shippingAddr2 || undefined,
          city: shippingCity || undefined,
          postal_code: shippingPost || undefined,
          country: shippingCountry || undefined,
        },
      },
    });
  } else {
    await stripe.customers.update(customer.id, {
      name: shippingName || undefined,
      phone: shippingPhone || undefined,
      address: {
        line1: shippingAddr1 || undefined,
        line2: shippingAddr2 || undefined,
        city: shippingCity || undefined,
        postal_code: shippingPost || undefined,
        country: shippingCountry || undefined,
      },
      shipping: {
        name: shippingName || undefined,
        phone: shippingPhone || undefined,
        address: {
          line1: shippingAddr1 || undefined,
          line2: shippingAddr2 || undefined,
          city: shippingCity || undefined,
          postal_code: shippingPost || undefined,
          country: shippingCountry || undefined,
        },
      },
    });
  }

  // 3) Create Checkout Session; pass metadata for webhook to create/attach order
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer: customer.id,
    shipping_address_collection: { allowed_countries: ["GR", "DE", "IT", "FR", "ES", "NL"] },
    phone_number_collection: { enabled: !!shippingPhone },
    line_items,
    metadata: {
      cartId: cart.id,
      // associate order to signed-in user in webhook
      customerId: customerId ?? "",
      email,
      shippingName,
      shippingPhone,
      shippingAddr1,
      shippingAddr2,
      shippingCity,
      shippingPost,
      shippingCountry,
    },
    success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/checkout/cancel`,
  });

  if (!session.url) throw new Error("Stripe session missing URL");
  redirect(session.url);
}
