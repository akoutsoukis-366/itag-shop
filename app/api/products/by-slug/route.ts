import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // or: import { PrismaClient } from "@prisma/client"; const prisma = new PrismaClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      ProductImage: { orderBy: { sort: "asc" } },
      variants: { orderBy: [{ isDefault: "desc" }, { priceCents: "asc" }] },
    },
  });

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}
