import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const u = await requireUser();
  if (!u) return new NextResponse("Unauthorized", { status: 401 });

  const [user, addresses, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: u.id }, select: { id: true, email: true, name: true, createdAt: true } }),
    prisma.address.findMany({ where: { userId: u.id } }),
    prisma.order.findMany({
      where: { customerId: u.id },
      include: { orderItems: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const body = JSON.stringify({ user, addresses, orders }, null, 2);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="account-export-${u.id}.json"`,
    },
  });
}
