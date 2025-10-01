import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendShippedEmail } from "@/lib/mailer";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
const { id } = await ctx.params;
const body = await req.json().catch(() => null);

const carrier = body?.carrier?.toString().trim() || null;
const trackingNumber = body?.trackingNumber?.toString().trim() || null;
const trackingUrl = body?.trackingUrl?.toString().trim() || null;
const requestSend = Boolean(body?.sendEmail);

const before = await prisma.order.findUnique({
where: { id },
select: { carrier: true, trackingNumber: true, trackingUrl: true, email: true },
});
if (!before) return new NextResponse("Order not found", { status: 404 });

const updated = await prisma.order.update({
where: { id },
data: { carrier, trackingNumber, trackingUrl },
select: { carrier: true, trackingNumber: true, trackingUrl: true },
});

await prisma.orderEvent.create({
data: { orderId: id, actor: null, type: "TRACKING_UPDATED", before, after: updated },
});

const firstSet =
(!before.carrier && !before.trackingNumber && !before.trackingUrl) &&
(!!carrier || !!trackingNumber || !!trackingUrl);

const shouldEmail = (firstSet || requestSend) && Boolean(before.email);
console.debug("tracking: decision", { requestSend, firstSet, to: before.email, shouldEmail });

let emailed = false;
if (shouldEmail && before.email) {
try {
await sendShippedEmail(before.email, { orderId: id, carrier, trackingNumber, trackingUrl });
emailed = true;
} catch (e) {
console.error("tracking: send mail failed", e);
}
}

return NextResponse.json({ ok: true, emailed });
}