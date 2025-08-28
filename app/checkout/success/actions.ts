"use server";

import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "../../../lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
apiVersion: "2024-12-18.acacia",
});

export async function loadOrderForSuccess(sessionId: string) {
noStore();

// First by session ID (non-unique)
let order = await prisma.order.findFirst({
where: { stripeSessionId: sessionId },
include: { lineItems: true },
});
if (order) return order;

// Fallback by PaymentIntent id
try {
const s = await stripe.checkout.sessions.retrieve(sessionId);
const piId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
if (!piId) return null;
order = await prisma.order.findFirst({
where: { stripePaymentIntentId: piId },
include: { lineItems: true },
});
return order ?? null;
} catch {
return null;
}
}