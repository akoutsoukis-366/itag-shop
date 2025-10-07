"use server";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, signIn, signOut } from "@/lib/auth";

export async function registerUser(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "");
  if (!email || !password) throw new Error("Missing credentials");

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error("Email already in use");

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash, name } });
  await signIn(user.id);
}

export async function loginUser(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid login");
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error("Invalid login");
  await signIn(user.id);
}

export async function logoutUser() {
  await signOut();
}
