// app/orders/[id]/page.tsx
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ResendEmailButton } from "@/app/components/ResendEmailButton";

type Props = { params: Promise<{ id: string }> };

export default async function OrderViewPage(props: Props) {
  const { id } = await props.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { orderItems: true },
  });

  if (!order) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold">Order not found</h1>
        <p className="mt-2 text-gray-600">Please check the link from the confirmation email.</p>
        <Link href="/" className="mt-6 inline-block underline">Back to store</Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold">Order #{order.id.slice(0, 8)}</h1>
      <p className="text-gray-600 mt-1">
        Status: {order.status} · Payment: {order.paymentStatus} · Total: €
        {(order.totalCents / 100).toFixed(2)}
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-medium mb-2">Items</h2>
        <ul className="space-y-2">
          {order.orderItems.map((it) => (
            <li key={it.id} className="flex justify-between border rounded p-3">
              <div>
                <div className="font-medium">{it.title}</div>
                {it.sku ? <div className="text-xs text-gray-500">SKU: {it.sku}</div> : null}
              </div>
              <div className="text-right">
                <div>Qty: {it.quantity}</div>
                <div>€{((it.unitCents * it.quantity) / 100).toFixed(2)}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 grid gap-1 text-sm text-gray-700">
        <div><span className="w-28 inline-block">Subtotal:</span> €{(order.subtotalCents / 100).toFixed(2)}</div>
        <div><span className="w-28 inline-block">Shipping:</span> €{(order.shippingCents / 100).toFixed(2)}</div>
        <div><span className="w-28 inline-block">Tax:</span> €{(order.taxCents / 100).toFixed(2)}</div>
        <div className="font-semibold"><span className="w-28 inline-block">Total:</span> €{(order.totalCents / 100).toFixed(2)}</div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-medium mb-2">Shipping</h2>
        <div className="text-sm text-gray-700">
          <div>{order.shippingName}</div>
          <div>{order.shippingAddr1}{order.shippingAddr2 ? `, ${order.shippingAddr2}` : ""}</div>
          <div>{order.shippingPost} {order.shippingCity}</div>
          <div>{order.shippingCountry}</div>
          {order.trackingNumber && (
            <div className="mt-2">
              Tracking:{" "}
              {order.trackingUrl ? (
                <a href={order.trackingUrl} className="underline" target="_blank" rel="noreferrer">
                  {order.trackingNumber}
                </a>
              ) : (
                order.trackingNumber
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 flex gap-3 items-center">
        <ResendEmailButton orderId={order.id} />
        <Link href="/products" className="rounded border px-4 py-2 hover:bg-gray-50">Continue shopping</Link>
      </section>
    </main>
  );
}
