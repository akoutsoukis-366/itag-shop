import { prisma } from "../../../../lib/db"; // Server Component by default

export const dynamic = "force-dynamic"; // Ensure fresh data when navigating

export default async function RefundsSection({ orderId }: { orderId: string }) {
const refunds = await prisma.refund.findMany({
where: { orderId },
orderBy: { createdAt: "asc" },
select: { id: true, amountCents: true, reason: true, stripeRefundId: true, createdAt: true },
}); // Server-side fetch in RSC is valid and recommended

const total = refunds.reduce((s, r) => s + r.amountCents, 0); // Compute total refunded

return (
<div className="rounded border p-4">
<div className="mb-2 text-sm font-semibold">Refunds</div>
{refunds.length === 0 ? (
<div className="text-sm text-gray-500">No refunds recorded.</div>
) : (
<ul className="space-y-1">
{refunds.map((r) => (
<li key={r.id} className="text-sm">
{r.createdAt.toISOString().slice(0, 19).replace("T", " ")}{" — "}
€{(r.amountCents / 100).toFixed(2)}{" "}
{r.reason ? <span>({r.reason})</span> : null}{" — "}
{r.stripeRefundId}
</li>
))}
</ul>
)}
<div className="mt-3 text-sm font-medium">Total refunded: €{(total / 100).toFixed(2)}</div>
</div>
); // Renders a list of refunds and a total line for clarity

} // Default export; in page.tsx import as: import RefundsSection from "./RefundsSection";