"use server";

import { prisma } from "@/lib/db";
import { requireUser, hashPassword, verifyPassword, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function updateProfile(formData: FormData) {
  const u = await requireUser();
  if (!u) redirect("/auth/login?next=/account/profile");

  const name = String(formData.get("name") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim() || null;
  if (!email) throw new Error("Email is required");

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== u.id) throw new Error("Email already in use");

  await prisma.user.update({
    where: { id: u.id },
    data: { name, email, phone },
  });

  redirect("/account/profile");
}

export async function changePassword(formData: FormData) {
  const u = await requireUser();
  if (!u) redirect("/auth/login?next=/account/profile");

  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  const confirm = String(formData.get("confirm") || "");
  if (!current || !next) throw new Error("Missing password");

  const row = await prisma.user.findUnique({ where: { id: u.id }, select: { passwordHash: true } });
  if (!row) throw new Error("User not found");

  const ok = await verifyPassword(current, row.passwordHash);
  if (!ok) throw new Error("Current password is incorrect");
  if (next !== confirm) throw new Error("Passwords do not match");

  const passwordHash = await hashPassword(next);
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash } });
  redirect("/account/profile");
}

export async function deleteMyAccount() {
  const u = await requireUser();
  if (!u) throw new Error("Unauthorized");

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({ where: { customerId: u.id }, data: { customerId: null } });
    await tx.address.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await tx.verificationToken.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await tx.user.delete({ where: { id: u.id } });
  });

  await signOut();
}
