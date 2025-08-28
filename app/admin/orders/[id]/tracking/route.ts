import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
// Next 15: await params
const { id } = await ctx.params; // required in Next 15

// Parse JSON body from client
const { carrier, trackingNumber, trackingUrl } = await req.json(); // parse request body

// Update the order; no-op if not found
await prisma.order.update({
where: { id },
data: {
carrier: carrier ?? null,
trackingNumber: trackingNumber ?? null,
trackingUrl: trackingUrl ?? null,
status: "SHIPPED",
},
});

return NextResponse.json({ ok: true });
}