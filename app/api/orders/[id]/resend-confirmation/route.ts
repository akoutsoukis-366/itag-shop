// app/api/orders/[id]/resend-confirmation/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/mailer";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { orderItems: true },
  });
  if (!order || !order.email) {
    return NextResponse.json({ ok: false, error: "Order or email not found" }, { status: 404 });
  }

  try {
    await sendOrderConfirmation(order.email, {
      orderId: order.id,
      totalCents: order.totalCents,
      items: order.orderItems.map((it) => ({
        title: it.title,
        quantity: it.quantity,
        unitCents: it.unitCents,
        sku: it.sku ?? undefined,
      })),
      shippingName: order.shippingName,
      shippingAddr1: order.shippingAddr1,
      shippingAddr2: order.shippingAddr2,
      shippingCity: order.shippingCity,
      shippingPost: order.shippingPost,
      shippingCountry: order.shippingCountry,
    });
    return NextResponse.json({ ok: true, message: "Confirmation email sent" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Send failed" }, { status: 500 });
  }
}
