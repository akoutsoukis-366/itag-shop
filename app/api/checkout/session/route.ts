import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" });

export async function POST(req: Request) {
const { items, email, currency = "eur" } = await req.json();
// Price in minor units from variants
const variants = await prisma.variant.findMany({ where: { id: { in: items.map((i: any) => i.variantId) } }, select: { id: true, price: true, sku: true } });
const line_items = items.map((i: any) => {
const v = variants.find((x) => x.id === i.variantId)!;
return { price_data: { currency, unit_amount: v.price, product_data: { name: v.sku } }, quantity: i.qty };
});

const session = await stripe.checkout.sessions.create({
mode: "payment",
customer_email: email,
line_items,
success_url: "http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}",
cancel_url: "http://localhost:3000/checkout/cancel",
});

return NextResponse.json({ url: session.url });
}

