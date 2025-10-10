import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function OrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const u = await requireUser();
  if (!u) return null;

  const sp = await searchParams;
  const pageNum = Math.max(1, parseInt(String(sp?.page ?? "1") || "1", 10));
  const take = 10;
  const skip = (pageNum - 1) * take;

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: u.id },
      orderBy: { createdAt: "asc" }, // or "desc" depending on preference
      skip,
      take,
      select: { id: true, totalCents: true, paymentStatus: true, status: true, createdAt: true },
    }),
    prisma.order.count({ where: { customerId: u.id } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / take));

  return (
    <main>
      <nav style={{ marginBottom: 12 }}>
        <Link href="/account">← Back to account</Link>
      </nav>
      <h1 style={{ marginBottom: 16 }}>Orders</h1>

      {rows.length === 0 ? (
        <div>No orders.</div>
      ) : (
        <ul style={{ display: "grid", gap: 8 }}>
          {rows.map((o) => (
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

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <Link key={p} href={`/account/orders?page=${p}`} className="underline" aria-current={p === pageNum}>
            {p}
          </Link>
        ))}
      </div>
    </main>
  );
}
