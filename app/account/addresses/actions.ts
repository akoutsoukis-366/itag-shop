"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function asBool(v: any) {
  return String(v) === "true" || String(v) === "on" || v === true;
}

export async function createAddress(formData: FormData) {
  const u = await requireUser();
  if (!u) throw new Error("Unauthorized");

  const data = {
    userId: u.id,
    label: String(formData.get("label") || "Address"),
    recipient: String(formData.get("recipient") || ""),
    phone: String(formData.get("phone") || "") || null,
    line1: String(formData.get("line1") || ""),
    line2: String(formData.get("line2") || "") || null,
    city: String(formData.get("city") || ""),
    postal: String(formData.get("postal") || ""),
    country: String(formData.get("country") || "GR"),
    isDefault: asBool(formData.get("isDefault")),
  };

  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId: u.id, isDefault: true }, data: { isDefault: false } });
  }

  await prisma.address.create({ data });
  revalidatePath("/account/addresses");
}

export async function updateAddress(formData: FormData) {
  const u = await requireUser();
  if (!u) throw new Error("Unauthorized");

  const id = String(formData.get("id") || "");
  const isDefault = asBool(formData.get("isDefault"));
  const data: any = {
    label: String(formData.get("label") || "Address"),
    recipient: String(formData.get("recipient") || ""),
    phone: String(formData.get("phone") || "") || null,
    line1: String(formData.get("line1") || ""),
    line2: String(formData.get("line2") || "") || null,
    city: String(formData.get("city") || ""),
    postal: String(formData.get("postal") || ""),
    country: String(formData.get("country") || "GR"),
    isDefault,
  };

  if (isDefault) {
    await prisma.address.updateMany({ where: { userId: u.id, isDefault: true }, data: { isDefault: false } });
  }

  await prisma.address.update({ where: { id }, data });
  revalidatePath("/account/addresses");
}

export async function deleteAddress(id: string) {
  const u = await requireUser();
  if (!u) throw new Error("Unauthorized");
  await prisma.address.delete({ where: { id } });
  revalidatePath("/account/addresses");
}
