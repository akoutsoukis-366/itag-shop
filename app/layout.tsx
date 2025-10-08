import "./globals.css";
import { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import HeaderUserMenu from "@/app/components/HeaderUserMenu";

<nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
  <Link href="/products" className="underline">Products</Link>
  <Link href="/cart" className="underline">Cart</Link>
  <HeaderUserMenu />
</nav>

export default async function RootLayout({ children }: { children: ReactNode }) {
  const u = await requireUser(); // null if guest

  return (
    <html lang="en">
      <body>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #eee" }}>
          <Link href="/" style={{ fontWeight: 700 }}>Hyperloq</Link>
          <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/products" className="underline">Products</Link>
            <Link href="/cart" className="underline">Cart</Link>
            {u ? (
              <>
                <Link href="/account" className="underline">{u.name ? u.name : u.email}</Link>
              </>
            ) : (
              <Link href="/auth/login" className="underline">Sign in</Link>
            )}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}