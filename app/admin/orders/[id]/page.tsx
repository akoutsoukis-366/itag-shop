import { prisma } from "../../../../lib/db";

function cents(n: number) { return (n / 100).toFixed(2); }

export default async function AdminOrderPage({ params }: { params: { id: string } }) {
const order = await prisma.order.findUnique({
where: { id: params.id },
include: {
refunds: { orderBy: { createdAt: "desc" } },
lineItems: true,
},
});

if (!order) {
return <div className="p-6">Order not found</div>;
}

const refundedTotal = order.refunds.reduce((sum, r) => sum + r.amountCents, 0);
const remainingRefundable = Math.max(0, order.totalCents - refundedTotal);

// Pull the last refund audit (if any) to show a recent requestId for support
const lastAudit = await prisma.audit.findFirst({
where: { orderId: order.id, type: "REFUND_REQUEST" },
orderBy: { createdAt: "desc" },
select: { id: true, createdAt: true, meta: true, ip: true, userAgent: true },
});

return (
<div className="p-6 space-y-6">
<h1 className="text-xl font-semibold">Order {order.id}</h1>
  <section className="space-y-2">
    <div>Status: {order.status} / Payment: {order.paymentStatus}</div>
    <div>Currency: {order.currency}</div>
    <div>Subtotal: € {cents(order.subtotalCents)} | Tax: € {cents(order.taxCents)} | Shipping: € {cents(order.shippingCents)}</div>
    <div>Total: € {cents(order.totalCents)}</div>
  </section>

  <section className="space-y-2">
    <h2 className="font-medium">Refunds</h2>
    <div>Refunded so far: € {cents(refundedTotal)}</div>
    <div>Remaining refundable: € {cents(remainingRefundable)}</div>

    {order.refunds.length === 0 ? (
      <div className="text-sm text-gray-500">No refunds yet</div>
    ) : (
      <ul className="list-disc ml-5">
        {order.refunds.map((r) => (
          <li key={r.id}>
            {new Date(r.createdAt).toLocaleString()} — € {cents(r.amountCents)} — {r.reason ?? "n/a"} — {r.stripeRefundId}
          </li>
        ))}
      </ul>
    )}
  </section>

  <section className="space-y-2">
    <h2 className="font-medium">Support diagnostics</h2>
    {lastAudit ? (
      <div className="text-sm">
        <div>Last refund request: {new Date(lastAudit.createdAt).toLocaleString()}</div>
        <div>RequestId: {typeof lastAudit.meta === "object" && lastAudit.meta ? (lastAudit.meta as any).requestId ?? "n/a" : "n/a"}</div>
        <div>IP: {lastAudit.ip ?? "n/a"}</div>
        <div>User-Agent: {lastAudit.userAgent ?? "n/a"}</div>
      </div>
    ) : (
      <div className="text-sm text-gray-500">No refund audit entries</div>
    )}
  </section>

  <section>
    <AdminRefundForm orderId={order.id} remainingRefundable={remainingRefundable} />
  </section>
</div>
);
}

// Inline client component to submit refund
"use client";
import { useState } from "react";

function AdminRefundForm({ orderId, remainingRefundable }: { orderId: string; remainingRefundable: number }) {
const [amount, setAmount] = useState<string>("");
const [reason, setReason] = useState<string>("");
const [resp, setResp] = useState<{ ok?: boolean; error?: string; refundId?: string; amountCents?: number } | null>(null);
const [loading, setLoading] = useState(false);

const onSubmit = async (e: React.FormEvent) => {
e.preventDefault();
setLoading(true);
setResp(null);
try {
// Server-to-server: Call a local server action API to avoid exposing internal key
const r = await fetch(/admin/api/orders/${orderId}/refund, {
method: "POST",
headers: { "content-type": "application/json" },
body: JSON.stringify({
amountCents: amount ? Math.round(parseFloat(amount) * 100) : undefined,
reason: reason || undefined,
}),
});
const data = await r.json().catch(() => ({}));
if (!r.ok) {
setResp({ ok: false, error: data?.error ?? HTTP ${r.status} });
} else {
setResp({ ok: true, refundId: data.refundId, amountCents: data.amountCents });
setAmount("");
setReason("");
}
} catch (err: any) {
setResp({ ok: false, error: String(err?.message ?? err) });
} finally {
setLoading(false);
}
};

return (
<form onSubmit={onSubmit} className="space-y-3 border p-4 rounded">
<h3 className="font-medium">Issue refund</h3>
<div className="text-sm text-gray-500">
Leave amount empty to refund the remaining balance. Remaining: € {(remainingRefundable/100).toFixed(2)}
</div>
<div className="flex gap-2">
<div className="flex-1">
<label className="block text-sm mb-1">Amount (EUR)</label>
<input
type="number"
step="0.01"
min="0"
className="border rounded px-2 py-1 w-full"
value={amount}
onChange={(e) => setAmount(e.target.value)}
placeholder="e.g. 5.00"
/>
</div>
<div className="flex-1">
<label className="block text-sm mb-1">Reason (optional)</label>
<input
type="text"
maxLength={100}
className="border rounded px-2 py-1 w-full"
value={reason}
onChange={(e) => setReason(e.target.value)}
placeholder="Customer request, damaged item, etc."
/>
</div>
</div>
  <button disabled={loading} type="submit" className="bg-black text-white px-3 py-1 rounded">
    {loading ? "Processing..." : "Refund"}
  </button>

  {resp && (
    <div className={`text-sm mt-2 ${resp.ok ? "text-green-600" : "text-red-600"}`}>
      {resp.ok ? (
        <>Refunded € {((resp.amountCents ?? 0)/100).toFixed(2)} — ID: {resp.refundId}</>
      ) : (
        <>Error: {resp.error}</>
      )}
    </div>
  )}
</form>
);
}