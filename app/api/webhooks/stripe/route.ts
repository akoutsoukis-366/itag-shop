import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/mailer";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" });

// Drop undefined keys so Prisma won't receive undefined for non-nullable fields
function omitUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

async function buildOrderFromCart(session: Stripe.Checkout.Session) {
  const cartId = typeof session.metadata?.cartId === "string" ? session.metadata.cartId : null;
  if (!cartId) return null;

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { CartItem: { include: { Variant: { include: { Product: true } } } } },
  });
  if (!cart || cart.CartItem.length === 0) return null;

  const subtotalCents = cart.CartItem.reduce((sum: number, ci: any) => {
    const unit = ci.unitCents ?? ci.Variant?.priceCents ?? 0;
    return sum + unit * (ci.quantity ?? 0);
  }, 0);

  return { cart, subtotalCents };
}

export async function POST(req: Request) {
  const signature = (await req.headers).get("stripe-signature") || "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new NextResponse("missing webhook secret", { status: 500 });
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return new NextResponse("sig verify failed", { status: 400 });
  }

  const isSuccess =
    event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded";
  const isFailure =
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "payment_intent.payment_failed" ||
    event.type === "charge.failed";

  if (!isSuccess && !isFailure) return NextResponse.json({ ignored: true });

  const session =
    event.type.startsWith("checkout.session")
      ? (event.data.object as Stripe.Checkout.Session)
      : undefined;
  const pi =
    event.type.startsWith("payment_intent")
      ? (event.data.object as Stripe.PaymentIntent)
      : undefined;

  const email =
    session?.customer_details?.email ??
    session?.metadata?.email ??
    pi?.charges?.data?.[0]?.billing_details?.email ??
    "";

  const intentId = (session?.payment_intent || pi?.id) as string | undefined;
  const sessionId = session?.id as string | undefined;
  const currencyCode = (session?.currency || pi?.currency || "eur").toUpperCase();
  const amount = (session?.amount_total || pi?.amount_received || 0) as number;

  // Option B: ALWAYS provide a non-empty session key to satisfy required stripeSessionId
  const sessionKey: string | null =
    (typeof sessionId === "string" && sessionId.length > 0 ? sessionId : null) ??
    (intentId ? `pi-${intentId}` : null);
  if (!sessionKey) {
    // Cannot satisfy required stripeSessionId; ignore safely
    return NextResponse.json({ ignored: true });
  }

  // From startCheckout metadata
  const customerIdMeta =
    (session?.metadata?.customerId as string | undefined) && session?.metadata?.customerId !== ""
      ? String(session!.metadata!.customerId)
      : null;

  const already = await prisma.processedEvent.findUnique({ where: { id: event.id } });
  if (already) return NextResponse.json({ ok: true, duplicate: true });

  try {
    if (isSuccess) {
      if (intentId) {
        if (session) {
          const built = await buildOrderFromCart(session);
          if (built) {
            const { cart, subtotalCents } = built;

            await prisma.order.upsert({
              where: { stripePaymentIntentId: intentId },
              create: {
                customerId: customerIdMeta ?? undefined,
                email: email || "unknown@example.com",
                paymentStatus: "PAID",
                status: "PENDING",
                currency: (cart.currency ?? "EUR").toUpperCase(),
                subtotalCents,
                taxCents: 0,
                shippingCents: 0,
                totalCents: subtotalCents,
                shippingName: cart.shippingName ?? session.customer_details?.name ?? "",
                shippingPhone: cart.shippingPhone ?? session.customer_details?.phone ?? "",
                shippingAddr1: cart.shippingAddr1 ?? "",
                shippingAddr2: cart.shippingAddr2 ?? "",
                shippingCity: cart.shippingCity ?? "",
                shippingPost: cart.shippingPost ?? "",
                shippingCountry: cart.shippingCountry ?? "GR",
                stripePaymentIntentId: intentId,
                stripeSessionId: sessionKey, // guaranteed non-empty
                orderItems: {
                  create: cart.CartItem.map((ci: any) => ({
                    variantId: ci.variantId,
                    title:
                      (ci.Variant?.Product?.title ?? "Product") +
                      (ci.Variant?.title ? " — " + ci.Variant.title : ""),
                    sku: ci.Variant?.sku ?? "",
                    quantity: ci.quantity,
                    unitCents: ci.unitCents ?? ci.Variant?.priceCents ?? 0,
                    vatRate: ci.Variant?.vatRate ?? 24,
                  })),
                },
              },
              update: omitUndefined({
                paymentStatus: "PAID",
                status: "PENDING",
                stripeSessionId: sessionKey, // backfill if missing
                customerId: customerIdMeta ?? undefined,
                email: email || undefined,
              }),
            });
          } else {
            await prisma.order.upsert({
              where: { stripePaymentIntentId: intentId },
              create: {
                customerId: customerIdMeta ?? undefined,
                email: email || "unknown@example.com",
                paymentStatus: "PAID",
                status: "PENDING",
                currency: currencyCode,
                subtotalCents: amount,
                taxCents: 0,
                shippingCents: 0,
                totalCents: amount,
                stripePaymentIntentId: intentId,
                stripeSessionId: sessionKey, // required field satisfied
              },
              update: omitUndefined({
                paymentStatus: "PAID",
                status: "PENDING",
                stripeSessionId: sessionKey,
                customerId: customerIdMeta ?? undefined,
                email: email || undefined,
              }),
            });
          }
        } else {
          // PI success without session — still must provide a session key (pi-<intent>)
          await prisma.order.upsert({
            where: { stripePaymentIntentId: intentId },
            create: {
              customerId: customerIdMeta ?? undefined,
              email: email || "unknown@example.com",
              paymentStatus: "PAID",
              status: "PENDING",
              currency: currencyCode,
              subtotalCents: amount,
              taxCents: 0,
              shippingCents: 0,
              totalCents: amount,
              stripePaymentIntentId: intentId,
              stripeSessionId: sessionKey, // pi-<intentId>
            },
            update: omitUndefined({
              paymentStatus: "PAID",
              status: "PENDING",
              stripeSessionId: sessionKey,
              customerId: customerIdMeta ?? undefined,
              email: email || undefined,
            }),
          });
        }
      } else {
        // Success but no PI id — rely solely on sessionKey
        await prisma.order.upsert({
          where: { stripeSessionId: sessionKey },
          create: {
            customerId: customerIdMeta ?? undefined,
            email: email || "unknown@example.com",
            paymentStatus: "PAID",
            status: "PENDING",
            currency: currencyCode,
            subtotalCents: amount,
            taxCents: 0,
            shippingCents: 0,
            totalCents: amount,
            stripeSessionId: sessionKey,
          },
          update: omitUndefined({
            paymentStatus: "PAID",
            status: "PENDING",
            customerId: customerIdMeta ?? undefined,
            email: email || undefined,
          }),
        });
      }
    } else if (isFailure) {
      const failureReason =
        (pi?.last_payment_error?.message as string | undefined) ||
        (pi?.last_payment_error?.code as string | undefined) ||
        "Payment failed";

      if (intentId) {
        await prisma.order.upsert({
          where: { stripePaymentIntentId: intentId },
          create: {
            customerId: customerIdMeta ?? undefined,
            email: email || "unknown@example.com",
            paymentStatus: "FAILED",
            status: "CANCELED",
            failureReason,
            currency: currencyCode,
            subtotalCents: amount,
            taxCents: 0,
            shippingCents: 0,
            totalCents: amount,
            stripePaymentIntentId: intentId,
            stripeSessionId: sessionKey, // pi-<intentId> when no real session
          },
          update: omitUndefined({
            paymentStatus: "FAILED",
            status: "CANCELED",
            failureReason,
            stripeSessionId: sessionKey,
          }),
        });
      } else {
        // Failure with only a session id (or derived key)
        await prisma.order.upsert({
          where: { stripeSessionId: sessionKey },
          create: {
            customerId: customerIdMeta ?? undefined,
            email: email || "unknown@example.com",
            paymentStatus: "FAILED",
            status: "CANCELED",
            failureReason,
            currency: currencyCode,
            subtotalCents: amount,
            taxCents: 0,
            shippingCents: 0,
            totalCents: amount,
            stripeSessionId: sessionKey,
          },
          update: {
            paymentStatus: "FAILED",
            status: "CANCELED",
            failureReason,
          },
        });
      }
    }

    // Mark event processed last for idempotency
    await prisma.processedEvent.create({ data: { id: event.id, type: event.type } });

    // Send confirmation only for successful Checkout session with ready data and PAID status
    if (event.type === "checkout.session.completed" && intentId) {
      try {
        const fresh = await prisma.order.findFirst({
          where: { stripePaymentIntentId: intentId },
          include: { orderItems: true },
        });
        const ready =
          !!fresh?.email &&
          Array.isArray(fresh.orderItems) &&
          fresh.orderItems.length > 0 &&
          !!fresh.shippingAddr1 &&
          fresh.paymentStatus === "PAID";

        if (fresh?.email && ready && !fresh.emailConfirmationSent) {
          await sendOrderConfirmation(fresh.email, {
            orderId: fresh.id,
            totalCents: fresh.totalCents,
            items: fresh.orderItems.map((it) => ({
              title: it.title,
              quantity: it.quantity,
              unitCents: it.unitCents,
              sku: it.sku ?? undefined,
            })),
            shippingName: fresh.shippingName ?? "",
            shippingAddr1: fresh.shippingAddr1 ?? "",
            shippingAddr2: fresh.shippingAddr2 ?? "",
            shippingCity: fresh.shippingCity ?? "",
            shippingPost: fresh.shippingPost ?? "",
            shippingCountry: fresh.shippingCountry ?? "",
          });
          await prisma.order.update({
            where: { id: fresh.id },
            data: { emailConfirmationSent: true },
          });
        }
      } catch {
        // ignore email errors
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook DB error:", err);
    return new NextResponse("db error", { status: 500 });
  }
}

export const config = { api: { bodyParser: false } };
