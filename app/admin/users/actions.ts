"use server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { requireAdminOrThrow } from "@/lib/auth";

export async function createUser(formData: FormData) {
  await requireAdminOrThrow();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "");
  const role = String(formData.get("role") || "USER") as any;
  const pw = String(formData.get("password") || "");
  if (!email || !pw) throw new Error("Missing fields");
  const passwordHash = await hashPassword(pw);
  await prisma.user.create({ data: { email, name, role, passwordHash } });
}

export async function updateUser(formData: FormData) {
  await requireAdminOrThrow();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "");
  const role = String(formData.get("role") || "USER") as any;
  const isActive = String(formData.get("isActive") || "true") === "true";
  const pw = String(formData.get("password") || "");
  const data: any = { name, role, isActive };
  if (pw) data.passwordHash = await hashPassword(pw);
  await prisma.user.update({ where: { id }, data });
}

export async function deleteUser(id: string) {
  await requireAdminOrThrow();
  await prisma.user.delete({ where: { id } });
}
