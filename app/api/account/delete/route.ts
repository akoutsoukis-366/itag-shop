import { NextResponse } from "next/server";
import { requireUser, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const u = await requireUser();
  if (!u) return new NextResponse("Unauthorized", { status: 401 });

  // Anonymize orders but keep financial records
  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { customerId: u.id },
      data: { customerId: null },
    });
    await tx.address.deleteMany({ where: { userId: u.id } });
    await tx.verificationToken.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await tx.user.delete({ where: { id: u.id } });
  });

  // Session cleanup
  await signOut();

  return NextResponse.json({ ok: true });
}
