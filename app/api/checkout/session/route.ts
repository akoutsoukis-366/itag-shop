import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST() {
try {
// Next 15: cookies() must be awaited
const store = await cookies();
const cartId = store.get("cart_id")?.value || null;
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
if (!cartId) {
  return NextResponse.redirect(new URL("/cart?err=empty", baseUrl), { status: 303 });
}

// Load cart with items and product context
const cart = await prisma.cart.findUnique({
  where: { id: cartId },
  include: {
    items: {
      include: {
        variant: { include: { product: true } },
      },
    },
  },
});

if (!cart || cart.items.length === 0) {
  return NextResponse.redirect(new URL("/cart?err=empty", baseUrl), { status: 303 });
}

// Build Stripe line items
const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.items.map((it: any) => {
  const title =
    (it.variant?.product?.title ?? "Product") +
    (it.variant?.title ? " — " + it.variant.title : "");
  const unit = Number(it.unitCents ?? it.variant?.priceCents ?? 0);
  const qty = Math.max(1, Number(it.quantity ?? 1));

  return {
    quantity: qty,
    price_data: {
      currency: "eur",
      unit_amount: unit,
      product_data: { name: title },
    },
  };
});

// IMPORTANT: use cartId (camelCase) to match webhook reader
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items,
  success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/cart`,
  metadata: { cartId: cart.id },
});

return NextResponse.redirect(session.url!, { status: 303 });
} catch (e: any) {
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"; // Determine base URL for redirection.
return NextResponse.redirect(
  new URL(`/cart?err=${encodeURIComponent(e?.message ?? "checkout_failed")}`, baseUrl),
  { status: 303 },
);
}
}

export async function GET() {
return POST();
}