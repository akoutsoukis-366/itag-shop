import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
const { id } = await ctx.params; // await in Next 15


// Parse and normalize
const body = await req.json().catch(() => null);
const carrier = body?.carrier?.toString().trim() || null;
const trackingNumber = body?.trackingNumber?.toString().trim() || null;
const trackingUrl = body?.trackingUrl?.toString().trim() || null;

// Overwrite existing values; allow clearing by sending empty strings -> null
const { count } = await prisma.order.updateMany({
where: { id },
data: { carrier, trackingNumber, trackingUrl },
});
if (count === 0) return new NextResponse("Order not found", { status: 404 });

return NextResponse.json({ ok: true });
}