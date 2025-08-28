import { prisma } from "../../../../lib/db";
import RefundsSection from "./RefundsSection";
import { TrackingForm } from "./TrackingForm";
import { StatusForm } from "./StatusForm";

function formatMoney(cents: number | null | undefined, currency = "EUR") {
const v = typeof cents === "number" ? cents : 0;
return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v / 100);
}

export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
const { id } = await params; // Next 15 requires awaiting params in Server Components for consistency with async contexts

const order = await prisma.order.findUnique({
where: { id },
include: {
lineItems: { select: { id: true, title: true, sku: true, quantity: true, unitCents: true } },
},
}); // Fetch full order with line items for the detail view in a Server Component

if (!order) {
return (
<div className="p-8">
<h1 className="text-2xl font-semibold mb-2">Order not found</h1>
<a className="text-blue-600 underline" href="/admin/orders">Back to list</a>
</div>
);
}

return (
<div className="p-8 space-y-6">
<div className="flex items-center justify-between">
<h1 className="text-2xl font-semibold">Order {order.id}</h1>
<a className="text-blue-600 underline" href="/admin/orders">Back to list</a>
</div>
  <div className="grid gap-4 md:grid-cols-2">
    <div className="rounded border p-4">
      <div className="mb-2 text-sm text-gray-500">Totals</div>
      <div className="text-sm">Subtotal {formatMoney(order.subtotalCents)}</div>
      <div className="text-sm">Tax {formatMoney(order.taxCents)}</div>
      <div className="text-sm">Shipping {formatMoney(order.shippingCents)}</div>
      <div className="mt-1 font-semibold">Total {formatMoney(order.totalCents)}</div>
      <div className="mt-2 text-sm">Payment: {order.paymentStatus}</div>
      <div className="mt-1 text-xs text-gray-500 break-all">
        Session: {order.stripeSessionId || "—"}
        <br />
        PI: {order.stripePaymentIntentId || "—"}
      </div>
    </div>

    <div className="rounded border p-4">
      <div className="mb-2 text-sm text-gray-500">Ship to</div>
      <div className="text-sm">{order.shippingName}</div>
      <div className="text-sm">
        {order.shippingAddr1}
        {order.shippingAddr2 ? `, ${order.shippingAddr2}` : ""}
      </div>
      <div className="text-sm">
        {order.shippingCity}, {order.shippingPost}, {order.shippingCountry}
      </div>
      <div className="text-sm">{order.shippingPhone}</div>
      <div className="mt-2 text-sm">Email: {order.email}</div>
    </div>
  </div>

  <div className="rounded border p-4">
    <div className="mb-2 text-sm font-semibold">Items</div>
    {order.lineItems.length === 0 ? (
      <div className="text-sm text-gray-500">No items recorded.</div>
    ) : (
      <ul className="space-y-1">
        {order.lineItems.map((li) => (
          <li key={li.id} className="text-sm">
            {li.title} — {li.quantity} × {formatMoney(li.unitCents)} {li.sku ? `(${li.sku})` : ""}
          </li>
        ))}
      </ul>
    )}
  </div>

  {/* Tracking read-only card */}
  <div className="rounded border p-4">
    <div className="mb-2 text-sm font-semibold">Tracking</div>
    {order.trackingNumber || order.trackingUrl || order.carrier ? (
      <div className="space-y-1 text-sm">
        <div>Carrier: {order.carrier ?? "—"}</div>
        <div>Number: {order.trackingNumber ?? "—"}</div>
        <div>
          Link:{" "}
          {order.trackingUrl ? (
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              Open tracking
            </a>
          ) : (
            "—"
          )}
        </div>
      </div>
    ) : (
      <div className="text-sm text-gray-500">No tracking set.</div>
    )}
  </div>

  {/* Editable forms */}
  <StatusForm orderId={order.id} current={order.status} />
  <TrackingForm
    orderId={order.id}
    currentCarrier={order.carrier}
    currentNumber={order.trackingNumber}
    currentUrl={order.trackingUrl}
  />

  {/* Refunds list */}
  <RefundsSection orderId={order.id} />
</div>
);
} 