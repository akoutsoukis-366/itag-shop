import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "../../../../lib/db";

function ensureEnv() {
const secret = process.env.STRIPE_SECRET_KEY;
const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!secret || !whSecret) throw new Error("Stripe env not configured");
return { secret, whSecret };
}

export async function POST(req: Request) {
// Initialize Stripe and verify signature on raw body
const { secret, whSecret } = ensureEnv();
const stripe = new Stripe(secret);
const sig = req.headers.get("stripe-signature") ?? "";
const raw = await req.text();

let event: Stripe.Event;
try {
event = stripe.webhooks.constructEvent(raw, sig, whSecret);
} catch {
return new NextResponse("Bad signature", { status: 400 });
}

// Idempotency: record processed event; if duplicate, return 200
try {
await prisma.processedEvent.create({ data: { id: event.id, type: event.type } });
} catch {
return NextResponse.json({ received: true, dedup: true });
}

// Use string guard to avoid TS narrowing to never
const t = event.type as string;

try {
switch (t) {
case "checkout.session.completed": {
const session = event.data.object as Stripe.Checkout.Session;
    const cartId = session.metadata?.cartId as string | undefined;
    if (!cartId) break;

    await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { id: cartId },
        include: {
          items: { include: { variant: { include: { product: true } } } },
        },
      });
      if (!cart || cart.items.length === 0) return;

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
        return { variantId: it.variantId, title, sku, quantity: qty, unitCents: unit, vatRate };
      });

      const shippingCents = 0;
      const totalCents = subtotalCents + taxCents + shippingCents;

      // Stock decrement with guard
      for (const it of cart.items) {
        const v = it.variant;
        if (v.stockQty != null) {
          const next = v.stockQty - it.quantity;
          if (next < 0) throw new Error("Stock would go negative");
          await tx.variant.update({ where: { id: it.variantId }, data: { stockQty: next } });
        }
      }

      // Resolve PaymentIntent id
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

      // Delivery snapshot
      const cd = session.customer_details;
      const shippingName = cart.shippingName ?? cd?.name ?? "N/A";
      const shippingPhone = cart.shippingPhone ?? cd?.phone ?? null;
      const shippingAddr1 = cart.shippingAddr1 ?? cd?.address?.line1 ?? "N/A";
      const shippingAddr2 = cart.shippingAddr2 ?? cd?.address?.line2 ?? null;
      const shippingCity = cart.shippingCity ?? cd?.address?.city ?? "N/A";
      const shippingPost = cart.shippingPost ?? cd?.address?.postal_code ?? "N/A";
      const shippingCountry = cart.shippingCountry ?? cd?.address?.country ?? "GR";

      // Because stripeSessionId may not be unique in schema, do findFirst+update or create
      const existing = await tx.order.findFirst({
        where: { stripeSessionId: session.id },
        select: { id: true },
      });

      if (existing) {
        await tx.order.update({
          where: { id: existing.id },
          data: {
            email: session.customer_details?.email ?? "unknown@example.com",
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
            stripePaymentIntentId: paymentIntentId,
          },
        });
      } else {
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
      }

      // Clear cart items
      await tx.cartItem.deleteMany({ where: { cartId } });
    });

    break;
  }

  case "payment_intent.succeeded": {
    const pi = event.data.object as Stripe.PaymentIntent;
    await prisma.order.updateMany({
      where: { stripePaymentIntentId: pi.id },
      data: { paymentStatus: "PAID" },
    });
    break;
  }

  // Refund handling: support both events to be robust across API versions
  case "refund.succeeded": {
    const refund = event.data.object as Stripe.Refund;
    const piId = typeof refund.payment_intent === "string" ? refund.payment_intent : null;
    if (!piId) break;

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { stripePaymentIntentId: piId },
        select: { id: true, totalCents: true, paymentStatus: true },
      });
      if (!order) return;

      const existing = await tx.refund.findUnique({ where: { stripeRefundId: refund.id } });
      if (!existing) {
        await tx.refund.create({
          data: {
            orderId: order.id,
            stripeRefundId: refund.id,
            amountCents: refund.amount ?? 0,
            reason: refund.reason ?? "requested_by_customer",
          },
        });
      }

      const agg = await tx.refund.aggregate({
        _sum: { amountCents: true },
        where: { orderId: order.id },
      });
      const refunded = agg._sum.amountCents ?? 0;
      const next = refunded >= order.totalCents ? "REFUNDED" : "PARTIALLY_REFUNDED";
      if (order.paymentStatus !== next) {
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: next } });
      }
    });

    break;
  }

  case "charge.refunded": {
    const charge = event.data.object as Stripe.Charge;
    const piId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id ?? null;
    if (!piId) break;

    // Optional: amount refunded is available via charge.amount_refunded
    const amount = (charge.amount_refunded as number | null) ?? 0;

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { stripePaymentIntentId: piId },
        select: { id: true, totalCents: true, paymentStatus: true },
      });
      if (!order) return;

      // Create a synthetic refund record if desired; otherwise, just set status by amount
      const next = amount >= order.totalCents ? "REFUNDED" : "PARTIALLY_REFUNDED";
      if (order.paymentStatus !== next) {
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: next } });
      }
    });

    break;
  }

  default:
    // No-op for other events
    break;
}

return NextResponse.json({ received: true });
} catch {
// Returning non-2xx triggers Stripe retry
return new NextResponse("Processing error", { status: 500 });
}
}