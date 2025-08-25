"use server";

import { prisma } from "../../lib/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// Next 15: cookies() is async; await the store before using it
async function getOrCreateCartByCookie(cookiesPromise: ReturnType<typeof cookies>) {
const cookieStore = await cookiesPromise;
const cartId = cookieStore.get("cart_id")?.value ?? null;

if (cartId) {
const existing = await prisma.cart.findUnique({ where: { id: cartId } });
if (existing) return existing;
}

const cart = await prisma.cart.create({ data: {} });
cookieStore.set("cart_id", cart.id, {
httpOnly: true,
sameSite: "lax",
path: "/",
});
return cart;
}

function displayName(variant: { title: string | null; product?: { title?: string | null } | null }) {
const p = variant.product?.title ?? "";
const v = variant.title ? " — " + variant.title : "";
return (p + v) || "item";
}

// Add item (programmatic)
export async function addToCart(input: { variantId: string; quantity?: number }) {
try {
const variantId = String(input.variantId);
const qty = Math.max(1, Math.floor(Number(input.quantity ?? 1)));
const variant = await prisma.variant.findUnique({
  where: { id: variantId },
  select: {
    id: true,
    title: true,
    stockQty: true,
    priceCents: true,
    currency: true,
    product: { select: { title: true } },
  },
});
if (!variant) return { ok: false, error: "Variant not found" };

if (variant.stockQty != null && variant.stockQty <= 0) return { ok: false, error: "Out of stock" };
if (variant.stockQty != null && variant.stockQty < qty) {
  return { ok: false, error: `Insufficient stock for ${displayName(variant)}` };
}

const cart = await getOrCreateCartByCookie(cookies());

const existing = await prisma.cartItem.findFirst({
  where: { cartId: cart.id, variantId },
  select: { id: true, quantity: true },
});

if (existing) {
  const newQty = existing.quantity + qty;
  if (variant.stockQty != null && variant.stockQty < newQty) {
    return { ok: false, error: "Insufficient stock for combined quantity" };
  }
  await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
} else {
  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      variantId,
      quantity: qty,
      unitCents: variant.priceCents,
      // currency: (variant.currency ?? "EUR").toUpperCase(),
    },
  });
}

// Keep SSR cart fresh when revisited
revalidatePath("/cart");
return { ok: true };
} catch (e: any) {
return { ok: false, error: e?.message ?? "Add to cart error" };
}
}

// Form wrapper (no redirect)
export async function addToCartFromForm(formData: FormData): Promise<void> {
const variantId = String(formData.get("variantId") || "");
const rawQty = formData.get("quantity") ?? formData.get("qty");
const quantity = Number(rawQty ?? 1);

const res = await addToCart({ variantId, quantity });
if (!res.ok) {
throw new Error(res.error ?? "Failed to add to cart");
}
}

// Update quantity (defensive)
export async function updateCartItemQuantity(input: { cartItemId: string; quantity: number }) {
try {
const id = String(input.cartItemId || "");
const qty = Math.max(0, Math.floor(Number(input.quantity)));
const item = await prisma.cartItem.findUnique({
  where: { id },
  select: { id: true, variantId: true },
});
if (!item) {
  revalidatePath("/cart");
  return { ok: true };
}

if (qty === 0) {
  await prisma.cartItem.delete({ where: { id: item.id } }).catch(() => {});
  revalidatePath("/cart");
  return { ok: true };
}

const variant = await prisma.variant.findUnique({
  where: { id: item.variantId },
  select: { stockQty: true, title: true, product: { select: { title: true } } },
});
if (!variant) return { ok: false, error: "Variant not found" };
if (variant.stockQty != null && variant.stockQty < qty) {
  return { ok: false, error: `Insufficient stock for ${(variant.product?.title ?? "Product")}${variant.title ? " — " + variant.title : ""}` };
}

await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: qty } });
revalidatePath("/cart");
return { ok: true };
} catch (e: any) {
return { ok: false, error: e?.message ?? "Update cart error" };
}
}

// Remove (defensive)
export async function removeFromCart(input: { cartItemId: string }) {
try {
const id = String(input.cartItemId || "");
if (!id) {
revalidatePath("/cart");
return { ok: true };
}
const existing = await prisma.cartItem.findUnique({ where: { id }, select: { id: true } });
if (!existing) {
revalidatePath("/cart");
return { ok: true };
}
await prisma.cartItem.delete({ where: { id: existing.id } });
revalidatePath("/cart");
return { ok: true };
} catch (e: any) {
return { ok: false, error: e?.message ?? "Remove cart item error" };
}
}

// Compatibility aliases
export { updateCartItemQuantity as updateItemAction };
export { removeFromCart as removeItemAction };