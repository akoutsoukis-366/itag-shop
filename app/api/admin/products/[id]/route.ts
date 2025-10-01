import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
const data = await req.json();
const updated = await prisma.product.update({ where: { id: params.id }, data });
return NextResponse.json(updated);
}
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
await prisma.product.delete({ where: { id: params.id } });
return NextResponse.json({ ok: true });
}