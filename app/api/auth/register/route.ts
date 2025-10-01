import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/app/lib/hash";
import { createSession } from "@/app/lib/session";

export async function POST(req: Request) {
const { email, password } = await req.json();
if (!email || !password) return NextResponse.json({ error: "Missing" }, { status: 400 });
const exists = await prisma.user.findUnique({ where: { email } });
if (exists) return NextResponse.json({ error: "Email in use" }, { status: 409 });
const user = await prisma.user.create({ data: { email, passwordHash: hashPassword(password) } });
await createSession({ id: user.id, role: user.role });
return NextResponse.json({ ok: true });
}