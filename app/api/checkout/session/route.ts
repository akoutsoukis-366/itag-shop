import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getCart } from "../../../../lib/cart";

export async function POST() {
try {
const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
}
const stripe = new Stripe(secret);
const cart = await getCart();
if (!cart.id || cart.items.length === 0) {
return NextResponse.json({ error: "Cart empty" }, { status: 400 });
}
// Stock re-validation before session creation
for (const it of cart.items) {
  const v = it.variant;
  if (v?.stockQty != null && v.stockQty < it.quantity) {
    const name = v.product?.title ? v.product.title + (v.title ? " — " + v.title : "") : "item";
    return NextResponse.json(
      { error: `Insufficient stock for ${name}` },
      { status: 400 }
    );
  }
}

const line_items = cart.items.map((it) => ({
  quantity: it.quantity,
  price_data: {
    currency: (it.variant.currency ?? "EUR").toLowerCase(),
    product_data: {
      name: `${it.variant.product.title} — ${it.variant.title}`,
    },
    unit_amount: it.variant.priceCents,
  },
}));

const successUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/checkout/success`;
const cancelUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/cart`;

const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items,
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: {
    cartId: cart.id,
  },
});

return NextResponse.redirect(session.url!, { status: 303 });
} catch (e: any) {
return NextResponse.json({ error: e?.message ?? "Checkout error" }, { status: 500 });
}
}