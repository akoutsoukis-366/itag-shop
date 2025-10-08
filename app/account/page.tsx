import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logoutUser } from "@/app/auth/actions";
import { deleteMyAccount } from "@/app/account/actions";

export default async function AccountHome() {
  const u = await requireUser();
  if (!u) return null;

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

  async function onLogout() {
    "use server";
    await logoutUser();
  }

  async function onDeleteAccount() {
    "use server";
    await deleteMyAccount();
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Account</h1>
        <form action={onLogout}>
          <button className="underline" type="submit">Sign out</button>
        </form>
      </div>

      <div style={{ margin: "8px 0 16px" }}>
        Signed in as <strong>{u.email}</strong>{u.name ? ` — ${u.name}` : ""}.
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <Link href="/account/profile" className="underline">Profile</Link>
        <Link href="/account/orders" className="underline">Orders</Link>
        <Link href="/account/addresses" className="underline">Addresses</Link>
      </div>

      <h2 style={{ marginBottom: 8 }}>Recent orders</h2>
      {orders.length === 0 ? (
        <div>No orders yet.</div>
      ) : (
        <ul style={{ display: "grid", gap: 8 }}>
          {orders.map((o) => (
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

      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <a className="underline" href="/api/account/export">Export data (JSON)</a>
        <form action={onDeleteAccount}>
          <button className="underline" type="submit">Delete account</button>
        </form>
      </div>
    </main>
  );
}
