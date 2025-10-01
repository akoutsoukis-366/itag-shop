import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/app/lib/hash";
import { createSession } from "@/app/lib/session";

export async function POST(req: Request) {
const { email, password } = await req.json();
const user = await prisma.user.findUnique({ where: { email } });
if (!user || !verifyPassword(password, user.passwordHash)) return NextResponse.json({ error: "Invalid creds" }, { status: 401 });
await createSession({ id: user.id, role: user.role });
return NextResponse.json({ ok: true });
}

middleware.ts (protect /admin)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret");

export async function middleware(req: NextRequest) {
if (!req.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();
const token = req.cookies.get("session")?.value;
if (!token) return NextResponse.redirect(new URL("/login", req.url));
try {
const { payload } = await jwtVerify(token, secret);
if (payload.role !== "ADMIN") return NextResponse.redirect(new URL("/", req.url));
return NextResponse.next();
} catch {
return NextResponse.redirect(new URL("/login", req.url));
}
}
export const config = { matcher: ["/admin/:path*"] };