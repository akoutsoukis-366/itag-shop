import { ReactNode } from "react";
import { requireUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const u = await requireUser();
  if (!u || u.role !== "ADMIN") {
    return (
      <main style={{ padding: 24 }}>
        <h1>Forbidden</h1>
        <p>This area is only for administrators.</p>
        <a href="/auth/login">Sign in</a>
      </main>
    );
  }
  return <section>{children}</section>;
}