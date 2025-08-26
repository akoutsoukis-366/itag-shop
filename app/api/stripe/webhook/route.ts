import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "../../../../lib/db";
import { logInfo, logWarn, logError } from "../../../../lib/log";
import { rateLimitTry, ipKey, pathKey, compositeKey } from "../../../../lib/rate-limit";
import { getRequestId } from "../../../../lib/request-id";
import { sendEmail } from "../../../../lib/email";

function ensureEnv() {
const secret = process.env.STRIPE_SECRET_KEY;
const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!secret || !whSecret) {
throw new Error("Stripe env not configured");
}
return { secret, whSecret };
}

export async function POST(req: Request) {
const requestId = getRequestId(req);

// Light rate limit
const xff = req.headers.get("x-forwarded-for") ?? "";
const [first] = xff.split(",");
const ip =
(first ? first.trim() : "") ||
((req as any).ip ? String((req as any).ip) : "") ||
"unknown";

const key = compositeKey([pathKey("/api/stripe/webhook"), ipKey(ip)]);
const rl = rateLimitTry(key, { capacity: 60, refillTokens: 60, refillIntervalMs: 60_000 });
if (!rl.allowed) {
return new NextResponse("Too many requests", {
status: 429,
headers: {
"x-ratelimit-limit": String(rl.limit),
"x-ratelimit-remaining": String(rl.remaining),
"x-ratelimit-reset": String(rl.reset),
"x-request-id": requestId,
},
});
}

// Init Stripe + verify signature
let stripe: Stripe;
let whSecret: string;
try {
const env = ensureEnv();
stripe = new Stripe(env.secret);
whSecret = env.whSecret;
} catch (e: any) {
logError("Webhook init error", { requestId, error: String(e) });
return new NextResponse("Stripe not configured", {
status: 500,
headers: { "x-request-id": requestId },
});
}

const sig = req.headers.get("stripe-signature") ?? "";
const raw = await req.text();

let event: Stripe.Event;
try {
event = stripe.webhooks.constructEvent(raw, sig, whSecret);
} catch (e: any) {
logError("Signature verification failed", { requestId, error: String(e?.message || e) });
return new NextResponse("Bad signature", {
status: 400,
headers: { "x-request-id": requestId },
});
}

// DB idempotency
try {
await prisma.processedEvent.create({
data: { id: event.id, type: event.type },
});
} catch {
logInfo("Event already processed", { requestId, eventId: event.id, type: event.type });
return NextResponse.json(
{ received: true },
{
headers: {
"x-ratelimit-limit": String(rl.limit),
"x-ratelimit-remaining": String(rl.remaining),
"x-ratelimit-reset": String(rl.reset),
"x-request-id": requestId,
},
}
);
}

try {
switch (event.type) {
case "checkout.session.completed": {
const session = event.data.object as Stripe.Checkout.Session;
    logInfo("Webhook session received", {
      requestId,
      sessionId: session.id,
      hasMetadata: Boolean(session.metadata),
      hasCartId: Boolean(session.metadata?.cartId),
      currency: session.currency ?? null,
      hasPI:
        typeof session.payment_intent === "string" ||
        Boolean((session.payment_intent as Stripe.PaymentIntent | null)?.id),
    });

    const cartId = session.metadata?.cartId as string | undefined;
    if (!cartId) {
      logWarn("No cartId in session metadata", { requestId, sessionId: session.id });
      break;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const cart = await tx.cart.findUnique({
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
          logWarn("Cart missing or empty", {
            requestId,
            cartId,
            hasCart: Boolean(cart),
            itemCount: cart?.items.length ?? 0,
          });
          return;
        }

        // Compute totals and snapshot items
        let subtotalCents = 0;
        let taxCents = 0;
        const orderItemsCreate = cart.items.map((it) => {
          const v = it.variant;
          const p = v.product;
          const unit = it.unitCents ?? v.priceCents;
          const qty = it.quantity;
          const line = unit * qty;
          subtotalCents += line;
          const vatRateNum = Number(v.vatRate ?? 0);
          taxCents += Math.round(line * (vatRateNum / 100));

          const title = p.title + (v.title ? " — " + v.title : "");
          const sku = v.sku ?? v.id;
          const vatRate = v.vatRate ?? 0;

          return {
            variantId: it.variantId,
            title,
            sku,
            quantity: qty,
            unitCents: unit,
            vatRate,
          };
        });

        const shippingCents = 0;
        const totalCents = subtotalCents + taxCents + shippingCents;

        // Stock decrement with negative guard
        for (const it of cart.items) {
          const v = it.variant;
          if (v.stockQty != null) {
            const newStock = v.stockQty - it.quantity;
            if (newStock < 0) {
              throw new Error(`Stock would go negative for variant ${v.id}`);
            }
            await tx.variant.update({
              where: { id: it.variantId },
              data: { stockQty: newStock },
            });
          }
        }

        // PaymentIntent
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? (session.payment_intent as string)
            : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

        // Prefer Cart-saved delivery details, fallback to Stripe session
        const cd = session.customer_details;
        const shippingName = cart.shippingName ?? cd?.name ?? "N/A";
        const shippingPhone = cart.shippingPhone ?? cd?.phone ?? null;
        const shippingAddr1 = cart.shippingAddr1 ?? cd?.address?.line1 ?? "N/A";
        const shippingAddr2 = cart.shippingAddr2 ?? cd?.address?.line2 ?? null;
        const shippingCity = cart.shippingCity ?? cd?.address?.city ?? "N/A";
        const shippingPost = cart.shippingPost ?? cd?.address?.postal_code ?? "N/A";
        const shippingCountry = cart.shippingCountry ?? cd?.address?.country ?? "GR";

        await tx.order.create({
          data: {
            customerId: null,
            email: session.customer_details?.email ?? "unknown@example.com",
            status: "PENDING",
            paymentStatus: paymentIntentId ? "PAID" : "UNPAID",
            currency: (session.currency ?? "eur").toUpperCase(),

            subtotalCents,
            taxCents,
            shippingCents,
            totalCents,

            shippingName,
            shippingPhone,
            shippingAddr1,
            shippingAddr2,
            shippingCity,
            shippingPost,
            shippingCountry,
            billingSameAsShipping: true,

            stripeSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,

            lineItems: { create: orderItemsCreate },
          },
        });

        // Clear cart items (cookie cleared on success page)
        await tx.cartItem.deleteMany({ where: { cartId } });
      });

      logInfo("Order created and cart cleared", {
        requestId,
        cartId,
        sessionId: session.id,
      });

      // Best-effort email
      const email = (event.data.object as Stripe.Checkout.Session).customer_details?.email;
      if (email) {
        sendEmail({
          to: email,
          subject: "Order confirmation",
          text: `Thanks for your order! Your checkout session is ${session.id}.`,
        }).catch(() => {});
      }
    } catch (err: any) {
      logError("Webhook order creation error", {
        requestId,
        sessionId: session.id,
        cartId,
        error: String(err?.message ?? err),
      });
    }

    break;
  }

  case "payment_intent.succeeded": {
    const pi = event.data.object as Stripe.PaymentIntent;
    const paymentIntentId = pi.id;

    await prisma.order.updateMany({
      where: { stripePaymentIntentId: paymentIntentId as string },
      data: { paymentStatus: "PAID" },
    });

    logInfo("Payment intent succeeded", { requestId, paymentIntentId });
    break;
  }

  case "payment_intent.payment_failed": {
    const pi = event.data.object as Stripe.PaymentIntent;
    const paymentIntentId = pi.id;
    const failure = pi.last_payment_error?.message ?? "unknown";

    await prisma.order.updateMany({
      where: { stripePaymentIntentId: paymentIntentId as string },
      data: { paymentStatus: "UNPAID" },
    });

    logWarn("Payment intent failed", { requestId, paymentIntentId, failure });
    break;
  }

  case "refund.succeeded": {
    const refund = event.data.object as Stripe.Refund;
    const stripeRefundId = refund.id;
    const paymentIntentId = refund.payment_intent;

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      logWarn("Webhook refund: missing paymentIntentId", { requestId, stripeRefundId });
      break;
    }

    const order = await prisma.order.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      select: { id: true, totalCents: true, paymentStatus: true },
    });
    if (!order) {
      logWarn("Webhook refund: order not found for PI", {
        requestId,
        paymentIntentId,
        stripeRefundId,
      });
      break;
    }

    const amountCents = refund.amount ?? 0;
    const reason = refund.reason ?? "requested_by_customer";

    await prisma.$transaction(async (tx) => {
      const existing = await tx.refund.findUnique({
        where: { stripeRefundId },
        select: { id: true },
      });
      if (!existing) {
        await tx.refund.create({
          data: {
            orderId: order.id,
            stripeRefundId,
            amountCents,
            reason,
          },
        });
      }

      const agg = await tx.refund.aggregate({
        _sum: { amountCents: true },
        where: { orderId: order.id },
      });
      const refunded = agg._sum.amountCents ?? 0;

      const nextStatus = refunded >= order.totalCents ? "REFUNDED" : "PARTIALLY_REFUNDED";

      if (order.paymentStatus !== nextStatus) {
        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: nextStatus },
        });
      }
    });

    logInfo("Webhook refund recorded", {
      requestId,
      stripeRefundId,
      paymentIntentId,
      amountCents,
      orderId: order.id,
    });

    break;
  }

  default: {
    logInfo("Unhandled Stripe event", { requestId, type: event.type });
  }
}

return NextResponse.json(
  { received: true },
  {
    headers: {
      "x-ratelimit-limit": String(rl.limit),
      "x-ratelimit-remaining": String(rl.remaining),
      "x-ratelimit-reset": String(rl.reset),
      "x-request-id": requestId,
    },
  }
);
} catch (e: any) {
logError("Webhook processing error", { requestId, error: String(e) });
return new NextResponse("Processing error", {
status: 500,
headers: { "x-request-id": requestId },
});
}
}