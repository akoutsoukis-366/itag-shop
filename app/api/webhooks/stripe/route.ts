import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/mailer";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" });

async function buildOrderFromCart(
  tx: typeof prisma,
  session: Stripe.Checkout.Session
): Promise<null | { subtotalCents: number; cart: any }> {
  const cartId = typeof session.metadata?.cartId === "string" ? session.metadata.cartId : null;
  if (!cartId) return null;

  const cart = await tx.cart.findUnique({
    where: { id: cartId },
    include: { CartItem: { include: { Variant: { include: { Product: true } } } } },
  });
  if (!cart || cart.CartItem.length === 0) return null;

  const subtotalCents = cart.CartItem.reduce((sum: number, ci: any) => {
    const unit = ci.unitCents ?? ci.Variant?.priceCents ?? 0;
    return sum + unit * (ci.quantity ?? 0);
  }, 0);

  return { cart, subtotalCents };
}

export async function POST(req: Request) {
  const signature = (await req.headers).get("stripe-signature") || "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new NextResponse("missing webhook secret", { status: 500 });
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return new NextResponse("sig verify failed", { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ ignored: true });
  }

  const session =
    event.type === "checkout.session.completed"
      ? (event.data.object as Stripe.Checkout.Session)
      : undefined;
  const pi =
    event.type === "payment_intent.succeeded"
      ? (event.data.object as Stripe.PaymentIntent)
      : undefined;

  // Pull reliable identifiers
  const email =
    session?.customer_details?.email ??
    session?.metadata?.email ??
    pi?.charges?.data?.[0]?.billing_details?.email ??
    "";

  // customerId was passed in session.metadata by startCheckout; empty string for guests
  const customerIdMeta =
    (session?.metadata?.customerId as string | undefined) && session?.metadata?.customerId !== ""
      ? String(session!.metadata!.customerId)
      : null;

  const currency = (session?.currency || pi?.currency || "eur") as string;
  const amount = (session?.amount_total || pi?.amount_received || 0) as number;
  const intentId = (session?.payment_intent || pi?.id) as string;
  const stripeSessionId = session?.id ?? null;

  const sessionKey =
    typeof stripeSessionId === "string" && stripeSessionId.length > 0
      ? stripeSessionId
      : `pi-${intentId}`;

  try {
    const already = await prisma.processedEvent.findUnique({ where: { id: event.id } });
    if (already) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const { orderId } = await prisma.$transaction(async (tx) => {
      let order =
        (await tx.order.findFirst({
          where: { stripeSessionId: sessionKey },
          include: { orderItems: true },
        })) ??
        (await tx.order.findFirst({
          where: { stripePaymentIntentId: intentId },
          include: { orderItems: true },
        }));

      if (!order) {
        if (session) {
          const built = await buildOrderFromCart(tx, session);
          if (!built) {
            throw new Error(
              "Missing or empty cart for Checkout session; refusing minimal order create"
            );
          }
          const { cart, subtotalCents } = built;

          order = await tx.order.create({
            data: {
              // associate to signed-in account if available
              customerId: customerIdMeta, // null for guest
              email: email || "unknown@example.com",
              paymentStatus: "PAID",
              status: "PENDING",
              currency: (cart.currency ?? "EUR").toUpperCase(),
              subtotalCents,
              taxCents: 0,
              shippingCents: 0,
              totalCents: subtotalCents,
              shippingName: cart.shippingName ?? session.customer_details?.name ?? "",
              shippingPhone: cart.shippingPhone ?? session.customer_details?.phone ?? "",
              shippingAddr1: cart.shippingAddr1 ?? "",
              shippingAddr2: cart.shippingAddr2 ?? "",
              shippingCity: cart.shippingCity ?? "",
              shippingPost: cart.shippingPost ?? "",
              shippingCountry: cart.shippingCountry ?? "GR",
              stripePaymentIntentId: intentId,
              stripeSessionId: sessionKey,
              orderItems: {
                create: cart.CartItem.map((ci: any) => ({
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
        } else {
          // Intent-only fallback (no session available)
          order = await tx.order.create({
            data: {
              customerId: customerIdMeta, // best effort; usually null in PI-only flow
              email: email || "unknown@example.com",
              paymentStatus: "PAID",
              status: "PENDING",
              currency: currency.toUpperCase(),
              subtotalCents: amount,
              taxCents: 0,
              shippingCents: 0,
              totalCents: amount,
              stripePaymentIntentId: intentId,
              stripeSessionId: sessionKey,
            },
            include: { orderItems: true },
          });
        }
      } else {
        // Update to PAID and attach missing identifiers if any
        order = await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            stripePaymentIntentId: order.stripePaymentIntentId ?? intentId,
            customerId: order.customerId ?? customerIdMeta ?? undefined,
            email: order.email || email ? email : undefined,
          },
          include: { orderItems: true },
        });
      }

      // Mark processed to ensure idempotency
      await tx.processedEvent.create({ data: { id: event.id, type: event.type } });

      return { orderId: order.id };
    });

    // Send confirmation only for Checkout session when order is ready
    if (event.type === "checkout.session.completed") {
      try {
        const maxAttempts = 12; // ~3s
        const delayMs = 250;
        let fresh: Awaited<ReturnType<typeof prisma.order.findUnique>> | null = null;
        let ready = false;

        for (let i = 0; i < maxAttempts; i++) {
          fresh = await prisma.order.findUnique({
            where: { id: orderId },
            include: { orderItems: true },
          });

          ready =
            !!fresh?.email &&
            Array.isArray(fresh.orderItems) &&
            fresh.orderItems.length > 0 &&
            !!fresh.shippingAddr1;

          if (ready) break;
          await new Promise((r) => setTimeout(r, delayMs));
        }

        if (fresh?.email && fresh.id && !fresh.emailConfirmationSent) {
          if (!ready) {
            await prisma.audit.create({
              data: {
                id: `email-todo-${fresh.id}`,
                type: "EMAIL_TODO_CONFIRMATION",
                orderId: fresh.id,
                meta: { reason: "not ready after webhook retries" },
              },
            });
          } else {
            await sendOrderConfirmation(fresh.email, {
              orderId: fresh.id,
              totalCents: fresh.totalCents,
              items: fresh.orderItems.map((it) => ({
                title: it.title,
                quantity: it.quantity,
                unitCents: it.unitCents,
                sku: it.sku ?? undefined,
              })),
              shippingName: fresh.shippingName,
              shippingAddr1: fresh.shippingAddr1,
              shippingAddr2: fresh.shippingAddr2,
              shippingCity: fresh.shippingCity,
              shippingPost: fresh.shippingPost,
              shippingCountry: fresh.shippingCountry,
            });
            await prisma.order.update({
              where: { id: fresh.id },
              data: { emailConfirmationSent: true },
            });
          }
        }
      } catch {
        // ignore email errors
      }
    }

    return NextResponse.json({ ok: true });
  } catch (dbErr) {
    console.error("Webhook DB error:", dbErr);
    return new NextResponse("db error", { status: 500 });
  }
}

export const config = { api: { bodyParser: false } };
