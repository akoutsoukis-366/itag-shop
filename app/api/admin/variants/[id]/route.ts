import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { id: string } }) {
const { delta, set } = await req.json();
const updated = await prisma.variant.update({
where: { id: params.id },
data: typeof set === "number" ? { stock: set } : { stock: { increment: delta ?? 0 } },
});
return NextResponse.json(updated);
}