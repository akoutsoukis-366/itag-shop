import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { id: string } }) {
const { role } = await req.json();
const updated = await prisma.user.update({ where: { id: params.id }, data: { role } });
return NextResponse.json(updated);
}