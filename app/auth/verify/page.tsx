import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) return <main style={{ padding: 24 }}>Missing token.</main>;

  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row || row.type !== "verify" || row.expiresAt < new Date()) {
    return <main style={{ padding: 24 }}>Invalid or expired token.</main>;
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  redirect("/account");
}
