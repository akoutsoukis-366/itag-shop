// app/auth/actions.ts
"use server";

import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, signIn, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { sendVerifyEmail, sendPasswordReset } from "@/lib/mailer";
import { allowAttempt } from "@/lib/rate-limit";

const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// REGISTER: create unverified account, send verification, DO NOT sign in yet
export async function registerUser(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "");
  const next = String(formData.get("next") || "");

  // Phone fields from register page (countryDial like "+30", phoneLocal like "69XXXXXXXX")
  const countryDialRaw = String(formData.get("countryDial") || "").trim();
  const phoneLocalRaw = String(formData.get("phoneLocal") || "").trim();

  if (!email || !password) return { ok: false, error: "Missing credentials" };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false, error: "Email already in use" };

  // Normalize phone to E.164-like format with safe defaults
  let phone: string | null = null;
  const localDigits = phoneLocalRaw.replace(/[^\d]/g, "");
  if (localDigits) {
    // Default to +30 if the select didn't submit a value
    const dialDigits = (countryDialRaw || "+30").replace(/[^\d]/g, "");
    const dial = `+${dialDigits}`;
    phone = `${dial}${localDigits}`;
  }

  // Enforce unique phone if provided
  if (phone) {
    const phoneExists = await prisma.user.findFirst({ where: { phone } });
    if (phoneExists) return { ok: false, error: "Phone already in use" };
  }

  const passwordHash = await hashPassword(password);

  // Store as unverified (emailVerifiedAt null) so login is blocked until verify
  const user = await prisma.user.create({
    data: { email, passwordHash, name, phone, emailVerifiedAt: null },
  });

  // Create verification token
  const token = crypto.randomUUID();
  const verifyUrl = `${base}/auth/verify?token=${encodeURIComponent(token)}`;
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      token,
      type: "verify",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
    },
  });
  await sendVerifyEmail(email, verifyUrl);

  // Backfill guest orders
  await prisma.order.updateMany({
    where: { email, customerId: null },
    data: { customerId: user.id },
  });

  // IMPORTANT: Do NOT sign in yet. Redirect to login with verify notice
  redirect(`/auth/login?verify=sent&next=${encodeURIComponent(next || "/")}`);
}

// LOGIN: block if not verified
export async function loginUser(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "");

  if (!email || !password) return { ok: false, error: "Missing email or password" };

  const key = `login:${email}`;
  if (!allowAttempt(key)) return { ok: false, error: "Too many attempts. Try again later." };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, emailVerifiedAt: true },
  });
  if (!user) return { ok: false, error: "Invalid email or password" };

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { ok: false, error: "Invalid email or password" };

  // Block login if not verified
  if (!user.emailVerifiedAt) {
    return { ok: false, error: "Please verify your email to activate your account" };
  }

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
