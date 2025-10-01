// app/admin/orders/[id]/page.tsx
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Next 15 async params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: {
        select: {
          id: true,
          title: true,
          sku: true,
          quantity: true,
          unitCents: true,
          vatRate: true,
          variantId: true,
        },
      },
      // include other relations if needed:
      // User: true,
      // orderEvents: true,
      // refunds: true,
    },
  });

  if (!order) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Order not found</h1>
        <p>No order exists with id {id}</p>
      </div>
    );
  }

  const totalEUR = (order.totalCents ?? 0) / 100;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Order {order.id}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded border p-4">
          <div className="font-medium mb-2">Summary</div>
          <div className="text-sm space-y-1">
            <div>Status: {order.status}</div>
            <div>Payment: {order.paymentStatus}</div>
            <div>Total: €{totalEUR.toFixed(2)}</div>
            <div>Currency: {order.currency}</div>
            <div>Created: {new Date(order.createdAt).toLocaleString()}</div>
          </div>
        </div>

        <div className="rounded border p-4">
          <div className="font-medium mb-2">Ship to</div>
          <div className="text-sm space-y-1">
            <div>{order.shippingName}</div>
            <div>{order.shippingAddr1}</div>
            {order.shippingAddr2 && <div>{order.shippingAddr2}</div>}
            <div>
              {order.shippingCity} {order.shippingPost}
            </div>
            <div>{order.shippingCountry}</div>
          </div>
        </div>
      </div>

      <div className="rounded border p-4">
        <div className="font-medium mb-3">Items</div>
        <div className="space-y-2 text-sm">
          {order.orderItems.map((it) => (
            <div key={it.id} className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="truncate">{it.title}</div>
                <div className="text-gray-600">SKU {it.sku}</div>
              </div>
              <div className="flex items-center gap-6">
                <div>Qty {it.quantity}</div>
                <div>€{((it.unitCents ?? 0) / 100).toFixed(2)}</div>
              </div>
            </div>
          ))}
          {order.orderItems.length === 0 && <div className="text-gray-500">No items.</div>}
        </div>
      </div>
    </div>
  );
}
