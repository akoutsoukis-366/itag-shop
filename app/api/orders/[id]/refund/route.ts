import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "../../../../../lib/db";
import { logInfo, logWarn, logError } from "../../../../../lib/log";
import { rateLimitTry, ipKey, pathKey, compositeKey } from "../../../../../lib/rate-limit";
import { getRequestId } from "../../../../../lib/request-id";
import { sendEmail } from "../../../../../lib/email";

function normalizeKey(v: string | null | undefined) {
return (v ?? "").trim();
}

// Strict internal admin key guard with rotation support
function requireInternalAuth(req: Request) {
const a = normalizeKey(process.env.INTERNAL_ADMIN_KEY);
const b = normalizeKey(process.env.INTERNAL_ADMIN_KEY_NEXT);
const incoming = normalizeKey(req.headers.get("x-internal-key"));
if (!a && !b) return false;
return incoming === a || (!!b && incoming === b);
}

// Optional IP allowlist: REFUND_IP_ALLOWLIST="127.0.0.1,::1"
function ipAllowed(ip: string): boolean {
const raw = process.env.REFUND_IP_ALLOWLIST;
if (!raw || raw.trim() === "") return true;
const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
return list.includes(ip);
}

export async function POST(
req: Request,
ctx: { params: Promise<{ id: string }> }
) {
const requestId = getRequestId(req);

// Rate limit early (per path + source IP)
const xff = req.headers.get("x-forwarded-for") ?? "";
const [first] = xff.split(",");
const ip =
(first ? first.trim() : "") ||
((req as any).ip ? String((req as any).ip) : "") ||
"unknown";

const key = compositeKey([pathKey("/api/orders/refund"), ipKey(ip)]);
const rl = rateLimitTry(key, {
capacity: 10,
refillTokens: 10,
refillIntervalMs: 60_000,
});
if (!rl.allowed) {
return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
status: 429,
headers: {
"content-type": "application/json",
"x-ratelimit-limit": String(rl.limit),
"x-ratelimit-remaining": String(rl.remaining),
"x-ratelimit-reset": String(rl.reset),
"x-request-id": requestId,
},
});
}

// Optional: block browser-origin calls if you only support server-to-server
const origin = req.headers.get("origin");
if (origin) {
return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
status: 403,
headers: { "content-type": "application/json", "x-request-id": requestId },
});
}

// Enforce internal key (with rotation)
if (!requireInternalAuth(req)) {
return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
status: 401,
headers: { "content-type": "application/json", "x-request-id": requestId },
});
}

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
logError("Refund: Stripe env not configured", { requestId });
return new NextResponse(JSON.stringify({ error: "Stripe not configured" }), {
status: 500,
headers: { "content-type": "application/json", "x-request-id": requestId },
});
}

const { id: orderId } = await ctx.params;

try {
// 1) Load and validate order
const order = await prisma.order.findUnique({
where: { id: orderId },
select: {
id: true,
paymentStatus: true,
totalCents: true,
stripePaymentIntentId: true,
currency: true,
email: true,
},
});
if (!order) {
  logWarn("Refund: order not found", { requestId, orderId });
  return new NextResponse(JSON.stringify({ error: "Order not found" }), {
    status: 404,
    headers: { "content-type": "application/json", "x-request-id": requestId },
  });
}

if (!order.stripePaymentIntentId) {
  logWarn("Refund: missing stripePaymentIntentId", { requestId, orderId });
  return new NextResponse(
    JSON.stringify({ error: "Order missing payment intent id" }),
    {
      status: 400,
      headers: { "content-type": "application/json", "x-request-id": requestId },
    }
  );
}

// Parse optional amountCents and refund reason from body (partial refunds)
let amountCents: number | undefined = undefined;
let reasonText: string | undefined = undefined;
try {
  const body = await req.json().catch(() => null);
  if (body) {
    if (Number.isFinite(body.amountCents)) {
      amountCents = Math.max(1, Math.floor(body.amountCents));
    }
    if (typeof body.reason === "string") {
      reasonText = body.reason.trim().slice(0, 100);
    }
  }
} catch {
  // ignore parse issues
}

// Enforce refundable balance
const refundedAgg = await prisma.refund.aggregate({
  _sum: { amountCents: true },
  where: { orderId: orderId },
});
const alreadyRefunded = refundedAgg._sum.amountCents ?? 0;
const remainingRefundable = Math.max(0, order.totalCents - alreadyRefunded);

const normalizedAmount = amountCents ?? remainingRefundable;

if (normalizedAmount <= 0) {
  return new NextResponse(
    JSON.stringify({
      error: "Nothing left to refund",
      alreadyRefunded,
      totalCents: order.totalCents,
    }),
    {
      status: 400,
      headers: { "content-type": "application/json", "x-request-id": requestId },
    }
  );
}

if (normalizedAmount > remainingRefundable) {
  return new NextResponse(
    JSON.stringify({
      error: "Refund exceeds remaining refundable amount",
      requested: normalizedAmount,
      remainingRefundable,
    }),
    {
      status: 400,
      headers: { "content-type": "application/json", "x-request-id": requestId },
    }
  );
}

// Only PAID or PARTIALLY_REFUNDED orders are refundable
if (
  order.paymentStatus !== "PAID" &&
  order.paymentStatus !== "PARTIALLY_REFUNDED"
) {
  logWarn("Refund: order not refundable state", {
    requestId,
    orderId,
    paymentStatus: order.paymentStatus,
  });
  return new NextResponse(
    JSON.stringify({ error: "Order is not refundable in current state" }),
    {
      status: 400,
      headers: { "content-type": "application/json", "x-request-id": requestId },
    }
  );
}

// 2) Create refund in Stripe with idempotency key
const stripe = new Stripe(secret);
const idemParts = ["refund", orderId, order.stripePaymentIntentId, String(normalizedAmount)];
const idempotencyKey = idemParts.join("_");

const refund = await stripe.refunds.create(
  {
    payment_intent: order.stripePaymentIntentId,
    amount: normalizedAmount,
    reason: "requested_by_customer",
    metadata: { orderId, requestId, reason: reasonText ?? "" },
  },
  { idempotencyKey }
);

const refundedNow = normalizedAmount;

// 3) Record refund and update order status atomically + write audit
await prisma.$transaction(async (tx) => {
  // Upsert-like by unique stripeRefundId
  const exists = await tx.refund.findUnique({
    where: { stripeRefundId: refund.id },
    select: { id: true },
  });
  if (!exists) {
    await tx.refund.create({
      data: {
        orderId,
        stripeRefundId: refund.id,
        amountCents: refundedNow,
        reason: reasonText ?? (refund.reason ?? "requested_by_customer"),
      },
    });
  }

  // Sum all refunds
  const agg = await tx.refund.aggregate({
    _sum: { amountCents: true },
    where: { orderId },
  });
  const refundedTotal = agg._sum.amountCents ?? 0;

  // Determine next status
  const nextStatus =
    refundedTotal >= order.totalCents ? "REFUNDED" : "PARTIALLY_REFUNDED";

  await tx.order.update({
    where: { id: orderId },
    data: { paymentStatus: nextStatus },
  });

  // Audit trail
  await tx.audit.create({
    data: {
      type: "REFUND_REQUEST",
      orderId,
      amountCents: refundedNow,
      actorType: "ADMIN_API",
      actorId: null,
      ip,
      userAgent: req.headers.get("user-agent") ?? null,
      meta: { idempotencyKey, requestId },
    },
  });
});

// Notify customer (best-effort, non-blocking)
if (order.email) {
  const remainingAgg = await prisma.refund.aggregate({
    _sum: { amountCents: true },
    where: { orderId },
  });
  const refundedTotal = remainingAgg._sum.amountCents ?? 0;
  const remaining = Math.max(0, order.totalCents - refundedTotal);

  sendEmail({
    to: order.email,
    subject: "Your refund has been processed",
    text: `We refunded € ${(refundedNow / 100).toFixed(2)}. Remaining refundable: € ${(
      remaining / 100
    ).toFixed(2)}.`,
  }).catch(() => {});
}

logInfo("Refund: completed", {
  requestId,
  orderId,
  refundId: refund.id,
  amountCents: refundedNow,
});

return new NextResponse(
  JSON.stringify({
    ok: true,
    refundId: refund.id,
    amountCents: refundedNow,
    requestId,
  }),
  {
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": String(rl.limit),
      "x-ratelimit-remaining": String(rl.remaining),
      "x-ratelimit-reset": String(rl.reset),
      "x-request-id": requestId,
    },
  }
);
} catch (e: any) {
logError("Refund: error", { requestId, orderId, error: String(e) });
// Optional internal alert
const internal = process.env.INTERNAL_ALERT_EMAIL;
if (internal) {
  sendEmail({
    to: internal,
    subject: "Refund error",
    text: `Order: ${orderId}, error: ${String(e)}`,
  }).catch(() => {});
}

return new NextResponse(JSON.stringify({ error: "Refund error" }), {
  status: 500,
  headers: { "content-type": "application/json", "x-request-id": requestId },
});
}
}
