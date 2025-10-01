import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  const store = await cookies();
  const cartId = store.get("cart_id")?.value || "";
  if (!cartId) return NextResponse.json({ count: 0 }, { status: 200 });

  const count = await prisma.cartItem.aggregate({
    where: { cartId },
    _sum: { quantity: true },
  });

  return NextResponse.json({ count: count._sum.quantity ?? 0 }, { status: 200 });
}