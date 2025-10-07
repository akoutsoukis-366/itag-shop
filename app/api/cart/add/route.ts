import { NextResponse } from "next/server";
import { addToCart } from "@/app/cart/actions"; // call internal logic

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { variantId, quantity = 1 } = body;
  if (!variantId) return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
  await addToCart(variantId, Number(quantity || 1));
  return NextResponse.json({ ok: true });
}
