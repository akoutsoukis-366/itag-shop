import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
const rows = await prisma.product.findMany({ include: { variants: true } });
return NextResponse.json(rows);
}
export async function POST(req: Request) {
const data = await req.json();
const product = await prisma.product.create({
data: {
title: data.title,
slug: data.slug,
description: data.description,
status: data.status ?? "DRAFT",
basePrice: data.basePrice ?? 0,
variants: {
create: (data.variants ?? []).map((v: any) => ({ sku: v.sku, price: v.price, stock: v.stock ?? 0 })),
},
},
});
return NextResponse.json(product, { status: 201 });
}