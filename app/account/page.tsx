import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AccountHome() {
  const u = await requireUser();
  if (!u) return null; // layout redirects

  const orders = await prisma.order.findMany({
    where: { customerId: u.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      totalCents: true,
      paymentStatus: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <main>
      <h1 style={{ marginBottom: 8 }}>Account</h1>
      <div style={{ marginBottom: 16 }}>
        Signed in as <strong>{u.email}</strong>{u.name ? ` — ${u.name}` : ""}.
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <Link href="/account/profile" className="underline">Profile</Link>
        <Link href="/account/orders" className="underline">Orders</Link>
      </div>

      <h2 style={{ marginBottom: 8 }}>Recent orders</h2>
      {orders.length === 0 ? (
        <div>No orders yet.</div>
      ) : (
        <ul style={{ display: "grid", gap: 8 }}>
          {orders.map(o => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className="underline">
                {o.id.slice(0, 12)}…
              </Link>{" "}
              — €{(o.totalCents / 100).toFixed(2)} — {o.paymentStatus} — {o.status} —{" "}
              {o.createdAt.toISOString().slice(0, 10)}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
