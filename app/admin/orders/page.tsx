import { prisma } from "../../../lib/db";

function formatMoney(cents: number | null | undefined, currency = "EUR") {
const v = typeof cents === "number" ? cents : 0;
return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v / 100);
}

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
const orders = await prisma.order.findMany({
orderBy: { createdAt: "desc" },
take: 100,
select: {
id: true,
createdAt: true,
totalCents: true,
paymentStatus: true,
shippingCity: true,
shippingCountry: true,
status: true,
trackingUrl: true,
},
}); // Server data fetch for list pages is the recommended pattern in the App Router

return (
<div className="p-8">
<h1 className="text-2xl font-semibold mb-4">Orders</h1>
  <div className="overflow-x-auto rounded border">
    <table className="min-w-[900px] w-full text-left">
      <thead className="bg-gray-50 text-xs uppercase tracking-wide">
        <tr>
          <th className="px-3 py-2">Created</th>
          <th className="px-3 py-2">Order</th>
          <th className="px-3 py-2">Total</th>
          <th className="px-3 py-2">Payment</th>
          <th className="px-3 py-2">Status</th>
          <th className="px-3 py-2">Track</th>
          <th className="px-3 py-2">Ship to</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {orders.map((o) => (
          <tr key={o.id} className="text-sm">
            <td className="px-3 py-2 whitespace-nowrap">
              {o.createdAt.toISOString().slice(0, 19).replace("T", " ")}
            </td>
            <td className="px-3 py-2">
              <a className="text-blue-600 underline" href={`/admin/orders/${o.id}`}>
                {o.id}
              </a>
            </td>
            <td className="px-3 py-2 whitespace-nowrap">{formatMoney(o.totalCents)}</td>
            <td className="px-3 py-2 whitespace-nowrap">{o.paymentStatus}</td>
            <td className="px-3 py-2 whitespace-nowrap">{o.status ?? "—"}</td>
            <td className="px-3 py-2 whitespace-nowrap">
              {o.trackingUrl ? (
                <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  Open
                </a>
              ) : (
                "—"
              )}
            </td>
            <td className="px-3 py-2 whitespace-nowrap">
              {o.shippingCity ?? "—"}, {o.shippingCountry ?? "—"}
            </td>
          </tr>
        ))}
        {orders.length === 0 && (
          <tr>
            <td className="px-3 py-6 text-center text-gray-500" colSpan={7}>
              No orders found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>
);
} 
