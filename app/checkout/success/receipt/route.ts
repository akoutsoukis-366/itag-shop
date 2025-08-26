import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
apiVersion: "2024-12-18.acacia", // or your pinned version


});

export async function GET(req: Request) {
const url = new URL(req.url);

const sid = url.searchParams.get("session_id") || "";
if (!sid) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

try {
// 1) Retrieve the Checkout Session to get Payment Intent id

const session = await stripe.checkout.sessions.retrieve(sid);
const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
if (!piId) return NextResponse.json({ error: "No payment intent on session" }, { status: 404 });
// 2) Retrieve PaymentIntent, then the latest charge for receipt_url[1]
const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] });[2]
const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;[1]
if (!chargeId) return NextResponse.json({ error: "No charge found for payment intent" }, { status: 404 });[1]

const ch = await stripe.charges.retrieve(chargeId);[1]
const receiptUrl = ch.receipt_url || null; // web link to Stripe-hosted receipt [1]

// Optional: if an alternate email is requested, update charge.receipt_email to trigger a resend[4]
const altEmail = url.searchParams.get("email");
let resent = false;
if (altEmail && /\S+@\S+\.\S+/.test(altEmail)) {
  await stripe.charges.update(ch.id, { receipt_email: altEmail }); // triggers send[4]
  resent = true;
}

return NextResponse.json({
  ok: true,
  receiptUrl,
  resent,
  currency: ch.currency,
  amount: ch.amount,
  customerEmail: ch.receipt_email || session.customer_details?.email || null,
});[4][1][2]

} catch (e: any) {
return NextResponse.json({ error: e?.message ?? "Stripe error" }, { status: 400 });
}
}