import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const u = await requireUser();
  if (!u) return null;

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, customerId: u.id },
    include: {
      orderItems: { include: { Variant: { include: { Product: { select: { title: true } } } } } },
    },
  });
  if (!order) return notFound();

  return (
    <main>
      <nav style={{ marginBottom: 12 }}>
        <Link href="/account/orders">← Back to orders</Link>
      </nav>

      <h1 style={{ marginBottom: 16 }}>Order {order.id}</h1>

      <div style={{ marginBottom: 12 }}>
        <div>Status: {order.status}</div>
        <div>Payment: {order.paymentStatus}</div>
        <div>Total: €{(order.totalCents / 100).toFixed(2)}</div>
        <div>Created: {order.createdAt.toISOString()}</div>
      </div>

      <h2>Items</h2>
      <ul style={{ display: "grid", gap: 8 }}>
        {order.orderItems.map(i => (
          <li key={i.id}>
            {(i.Variant.Product?.title ?? "Product")} — {i.title} — x{i.quantity} — €
            {(i.unitCents / 100).toFixed(2)} — VAT {String(i.vatRate)}
          </li>
        ))}
      </ul>
    </main>
  );
}
