// app/checkout/success/receipt/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function backfillOrderFromCart(orderId: string, sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId).catch(() => null);
  if (!session) return null;

  const cartId = typeof session.metadata?.cartId === "string" ? session.metadata.cartId : null;
  if (!cartId) return null;

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { CartItem: { include: { Variant: { include: { Product: true } } } } },
  });
  if (!cart || cart.CartItem.length === 0) return null;

  const subtotalCents = cart.CartItem.reduce((sum, ci) => {
    const unit = ci.unitCents ?? ci.Variant?.priceCents ?? 0;
    return sum + unit * (ci.quantity ?? 0);
  }, 0);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      currency: (cart.currency ?? "EUR").toUpperCase(),
      subtotalCents,
      totalCents: subtotalCents,
      shippingName: cart.shippingName ?? undefined,
      shippingPhone: cart.shippingPhone ?? undefined,
      shippingAddr1: cart.shippingAddr1 ?? undefined,
      shippingAddr2: cart.shippingAddr2 ?? undefined,
      shippingCity: cart.shippingCity ?? undefined,
      shippingPost: cart.shippingPost ?? undefined,
      shippingCountry: cart.shippingCountry ?? undefined,
      orderItems: {
        create: cart.CartItem.map((ci) => ({
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
  });

  return prisma.order.findUnique({ where: { id: orderId }, include: { orderItems: true } });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // 1) Try real session id
    let order =
      (await prisma.order.findUnique({
        where: { stripeSessionId: sessionId },
        include: { orderItems: true },
      })) || null;

    // 2) If not found and not cash, try synthetic key
    if (!order && !sessionId.startsWith("cash-")) {
      try {
        const s = await stripe.checkout.sessions.retrieve(sessionId);
        const intentId = (s.payment_intent as string) || "";
        const synthetic = intentId ? `pi-${intentId}` : "";
        if (synthetic) {
          order =
            (await prisma.order.findUnique({
              where: { stripeSessionId: synthetic },
              include: { orderItems: true },
            })) || null;

          // Normalize to real session id for future lookups
          if (order && s.id && order.stripeSessionId !== s.id) {
            await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: s.id } });
            order = await prisma.order.findUnique({
              where: { stripeSessionId: s.id },
              include: { orderItems: true },
            });
          }
        }
      } catch {
        // ignore
      }
    }

    // 3) If order exists but is empty, try backfilling from cart
    if (order && order.orderItems.length === 0 && !sessionId.startsWith("cash-")) {
      const filled = await backfillOrderFromCart(order.id, sessionId);
      if (filled) order = filled;
    }

    // 4) If still no order, optionally create placeholder from cart (UNPAID)
    if (!order) {
      // Optional: create UNPAID placeholder same as before
      // Or skip and return verified:false to show failure state
      return NextResponse.json({ verified: false }, { status: 200 });
    }

    const isCash = sessionId.startsWith("cash-");
    const verified = isCash ? true : order.paymentStatus === "PAID";

    const res = NextResponse.json(
      {
        verified,
        id: order.id,
        total: order.totalCents,
        items: order.orderItems.map((it) => ({
          name: it.title,
          price: it.unitCents,
          quantity: it.quantity,
        })),
        shipping: {
          name: order.shippingName ?? "",
          address: order.shippingAddr1 ?? "",
          city: order.shippingCity ?? "",
          postalCode: order.shippingPost ?? "",
          country: order.shippingCountry ?? "GR",
        },
        customerEmail: order.email,
        trackingNumber: order.trackingNumber ?? null,
        trackingUrl: order.trackingUrl ?? null,
        carrier: order.carrier ?? null,
        order: {
          id: order.id,
          email: order.email,
          paymentStatus: order.paymentStatus,
          totalCents: order.totalCents,
          shippingName: order.shippingName ?? "",
          shippingAddr1: order.shippingAddr1 ?? "",
          shippingAddr2: order.shippingAddr2 ?? "",
          shippingCity: order.shippingCity ?? "",
          shippingPost: order.shippingPost ?? "",
          shippingCountry: order.shippingCountry ?? "GR",
          orderItems: order.orderItems.map((it) => ({
            id: it.id,
            title: it.title,
            sku: it.sku,
            quantity: it.quantity,
            unitCents: it.unitCents,
          })),
        },
      },
      { status: 200 }
    );

    // Clear cart cookie
    res.cookies.set("cart_id", "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });

    return res;
  } catch (e) {
    console.error("Receipt route error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return NextResponse.json({ ok: true }, { status: 200 });
}
