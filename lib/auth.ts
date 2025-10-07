// lib/auth.ts
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

// Minimal session cookie
const SESSION = "session_user_id";

export async function requireUser() {
  const store = await cookies();
  const id = store.get(SESSION)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true } });
}

export async function requireAdminOrThrow() {
  const u = await requireUser();
  if (!u || u.role !== "ADMIN") throw new Error("Forbidden");
  return u;
}

export async function signIn(userId: string) {
  const store = await cookies();
  store.set(SESSION, userId, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function signOut() {
  const store = await cookies();
  store.delete(SESSION);
}
