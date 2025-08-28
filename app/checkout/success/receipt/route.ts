import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
apiVersion: "2024-12-18.acacia",
});

export async function GET(req: Request) {
try {
const url = new URL(req.url);
const sid = url.searchParams.get("session_id") || "";
if (!sid) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
const session = await stripe.checkout.sessions.retrieve(sid);
const piId =
  typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;
if (!piId) return NextResponse.json({ error: "No payment intent on session" }, { status: 404 });

const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
const chargeId =
  typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
if (!chargeId) return NextResponse.json({ error: "No charge found" }, { status: 404 });

const ch = await stripe.charges.retrieve(chargeId);
const receiptUrl = ch.receipt_url || null;

const altEmail = url.searchParams.get("email");
let resent = false;
if (altEmail && /\S+@\S+\.\S+/.test(altEmail)) {
  await stripe.charges.update(ch.id, { receipt_email: altEmail });
  resent = true;
}

return NextResponse.json({
  ok: true,
  receiptUrl,
  resent,
  currency: ch.currency,
  amount: ch.amount,
  customerEmail: ch.receipt_email || session.customer_details?.email || null,
});
} catch (e: any) {
return NextResponse.json({ error: e?.message ?? "Stripe error" }, { status: 400 });
}
}