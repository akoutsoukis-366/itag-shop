import { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const u = await requireUser();
  if (!u) redirect("/auth/login?next=/account");
  return <section style={{ padding: 24 }}>{children}</section>;
}
