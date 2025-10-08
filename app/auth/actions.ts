"use server";

import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, signIn, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { sendVerifyEmail, sendPasswordReset } from "@/lib/mailer";
import { allowAttempt } from "@/lib/rate-limit";

const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function registerUser(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "");
  const next = String(formData.get("next") || "");
  if (!email || !password) return { ok: false, error: "Missing credentials" };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false, error: "Email already in use" };

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash, name } });

  // Create verification token
  const token = crypto.randomUUID();
  const verifyUrl = `${base}/auth/verify?token=${encodeURIComponent(token)}`;
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      token,
      type: "verify",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });
  await sendVerifyEmail(email, verifyUrl);

  // Backfill guest orders
  await prisma.order.updateMany({
    where: { email, customerId: null },
    data: { customerId: user.id },
  });

  // Sign in and redirect
  await signIn(user.id);
  redirect(next || "/");
}

export async function loginUser(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "");

  if (!email || !password) return { ok: false, error: "Missing email or password" };

  const key = `login:${email}`;
  if (!allowAttempt(key)) return { ok: false, error: "Too many attempts. Try again later." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false, error: "Invalid email or password" };

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { ok: false, error: "Invalid email or password" };

  // Backfill guest orders
  await prisma.order.updateMany({
    where: { email, customerId: null },
    data: { customerId: user.id },
  });

  await signIn(user.id);
  redirect(next || "/");
}

export async function logoutUser() {
  await signOut();
  redirect("/");
}

// Password reset: request
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Email required" };
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { ok: true }; // do not reveal existence

  const token = crypto.randomUUID();
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      token,
      type: "reset",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1h
    },
  });
  const resetUrl = `${base}/auth/reset?token=${encodeURIComponent(token)}`;
  await sendPasswordReset(email, resetUrl);
  return { ok: true };
}

// Password reset: submit
export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  if (!token || !password) return { ok: false, error: "Missing data" };

  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row || row.type !== "reset" || row.expiresAt < new Date()) {
    return { ok: false, error: "Invalid or expired token" };
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return { ok: true };
}
