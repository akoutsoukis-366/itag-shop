import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

function allow(req: Request) {
const required = (process.env.INTERNAL_ADMIN_KEY ?? "").trim();
const incoming = (req.headers.get("x-internal-key") ?? "").trim();
return required && incoming === required;
}

export async function GET(req: Request) {
if (!allow(req)) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const [byStatus, refunds24h, refunds7d, unprocessed] = await Promise.all([
prisma.order.groupBy({
by: ["status"],
_count: { _all: true },
}),
prisma.refund.aggregate({
_sum: { amountCents: true },
where: { createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
}),
prisma.refund.aggregate({
_sum: { amountCents: true },
where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
}),
// Should be zero if you use it; else omit if you don’t store pending events.
prisma.processedEvent.count().then(() => 0).catch(() => 0),
]);

return NextResponse.json({
ordersByStatus: byStatus.map((g) => ({ status: g.status, count: g._count._all })),
refundsLast24hCents: refunds24h._sum.amountCents ?? 0,
refundsLast7dCents: refunds7d._sum.amountCents ?? 0,
unprocessedEvents: unprocessed, // placeholder
});
}