import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { logoutUser } from "@/app/auth/actions";

export default async function HeaderUserMenu() {
  const u = await requireUser();
  if (!u) {
    return <Link href="/auth/login" className="underline">Sign in</Link>;
  }

  async function onLogout() {
    "use server";
    await logoutUser();
  }

  return (
    <div style={{ position: "relative" }}>
      <details>
        <summary style={{ cursor: "pointer", listStyle: "none" }}>
          {u.name || u.email}
        </summary>
        <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", border: "1px solid #eee", borderRadius: 6, padding: 8, minWidth: 160 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <Link href="/account" className="underline">Account</Link>
            <Link href="/account/orders" className="underline">Orders</Link>
            <Link href="/account/addresses" className="underline">Addresses</Link>
            <form action={onLogout}><button type="submit" className="underline">Sign out</button></form>
          </div>
        </div>
      </details>
    </div>
  );
}
