import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
const { id } = await ctx.params; // Next 15


const { status } = await req.json().catch(() => ({} as any));
const normalized = typeof status === "string" ? status.trim().toUpperCase() : null;
if (!normalized) return new NextResponse("Bad status", { status: 400 });

const { count } = await prisma.order.updateMany({
where: { id },
data: { status: normalized },
});
if (count === 0) return new NextResponse("Order not found", { status: 404 });

return NextResponse.json({ ok: true });
}