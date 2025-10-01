import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
const { id } = await ctx.params;
const { status } = await req.json().catch(() => ({}));
const normalized = typeof status === "string" ? status.trim().toUpperCase() : null;
if (!normalized) return new NextResponse("Bad status", { status: 400 });

const before = await prisma.order.findUnique({ where: { id }, select: { status:true } });
if (!before) return new NextResponse("Order not found", { status: 404 });

const updated = await prisma.order.update({
where: { id },
data: { status: normalized },
select: { status:true },
});

await prisma.orderEvent.create({
data: { orderId: id, actor: null, type: "STATUS_UPDATED", before, after: updated },
});

return NextResponse.json({ ok: true });
}


// In app/admin/orders/[id]/page.tsx, after fetching order, also:
const events = await prisma.orderEvent.findMany({
where: { orderId: id }, orderBy: { createdAt: 'desc' }, take: 10,
});
// Then render:
<div className="rounded border p-4"> <div className="mb-2 text-sm font-semibold">History</div> {events.length === 0 ? <div className="text-sm text-gray-500">No events.</div> : <ul className="space-y-1 text-sm"> {events.map(e => ( <li key={e.id}> {e.createdAt.toISOString().slice(0,19).replace('T',' ')} — {e.type} </li> ))} </ul>} </div>