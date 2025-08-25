"use server";

import { prisma } from "../lib/db";
import { getCartId, setCartId } from "../lib/cookies";

type Totals = {
subtotalCents: number;
vatCents: number;
totalCents: number;
};

const MAX_QTY_PER_LINE = 10;

function clampQty(qty: number) {
if (!Number.isFinite(qty)) return 1;
return Math.max(1, Math.min(MAX_QTY_PER_LINE, Math.floor(qty)));
}

async function ensureCart() {
let id = await getCartId();
if (id) {
const cart = await prisma.cart.findUnique({ where: { id } });
if (cart) return cart;
}
const cart = await prisma.cart.create({ data: {} });
await setCartId(cart.id);
return cart;
}

export async function getCart() {
const id = await getCartId();
if (!id) {
return {
id: null as string | null,
items: [] as any[],
totals: { subtotalCents: 0, vatCents: 0, totalCents: 0 } as Totals,
};
}

const cart = await prisma.cart.findUnique({
where: { id },
include: {
items: {
include: {
variant: { include: { product: true } },
},
},
},
});

if (!cart) {
return {
id: null,
items: [],
totals: { subtotalCents: 0, vatCents: 0, totalCents: 0 },
};
}

const totals = cart.items.reduce(
(acc, it) => {
// Prefer item snapshot (unitCents) for totals; fall back to variant.priceCents if needed
const unit = it.unitCents ?? it.variant.priceCents;
const qty = it.quantity;
const line = unit * qty;
  // If your Variant doesn’t have vatRate, this stays 0
  const vatRate = Number(it.variant.vatRate ?? 0);
  const vat = Math.round(line * (vatRate / 100));

  acc.subtotalCents += line;
  acc.vatCents += vat;
  acc.totalCents += line + vat;
  return acc;
},
{ subtotalCents: 0, vatCents: 0, totalCents: 0 } as Totals
);

return {
id: cart.id,
items: cart.items,
totals,
};
}

export async function addToCart(variantId: string, qty: number) {
const quantity = clampQty(qty);
const cart = await ensureCart();

await prisma.$transaction(async (tx) => {
const variant = await tx.variant.findUnique({
where: { id: variantId },
include: { product: true },
});
if (!variant) throw new Error("Variant not found");
if (variant.product.status !== "ACTIVE") throw new Error("Product inactive");
// Find existing item for this variant
const existing = await tx.cartItem.findFirst({
  where: { cartId: cart.id, variantId },
});

const nextQty = (existing?.quantity ?? 0) + quantity;
const finalQty = clampQty(nextQty);

// Optional stock check if your Variant has stockQty
if (variant.stockQty != null && finalQty > variant.stockQty) {
  throw new Error("Insufficient stock");
}

if (finalQty === 0) {
  if (existing) {
    await tx.cartItem.delete({ where: { id: existing.id } });
  }
  return;
}

if (existing) {
  // Preserve unitCents snapshot on updates
  await tx.cartItem.update({
    where: { id: existing.id },
    data: {
      quantity: finalQty,
    },
  });
} else {
  // Create with required unitCents snapshot
  await tx.cartItem.create({
    data: {
      cartId: cart.id,
      variantId,
      quantity: finalQty,
      unitCents: variant.priceCents, // required by your schema
    },
  });
}
});

return getCart();
}

export async function updateItem(cartItemId: string, qty: number) {
const id = await getCartId();
if (!id) return getCart();

const quantity = Math.max(0, Math.min(MAX_QTY_PER_LINE, Math.floor(qty)));

await prisma.$transaction(async (tx) => {
const item = await tx.cartItem.findUnique({
where: { id: cartItemId },
include: { variant: true },
});
if (!item) return;
const cart = await tx.cart.findUnique({ where: { id } });
if (!cart || cart.id !== item.cartId) return;

if (quantity === 0) {
  await tx.cartItem.delete({ where: { id: item.id } });
  return;
}

if (item.variant.stockQty != null && quantity > item.variant.stockQty) {
  throw new Error("Insufficient stock");
}

await tx.cartItem.update({
  where: { id: item.id },
  data: {
    quantity,
    // keep unitCents unchanged as price snapshot
  },
});
});

return getCart();
}

export async function removeItem(cartItemId: string) {
const id = await getCartId();
if (!id) return getCart();

await prisma.$transaction(async (tx) => {
const item = await tx.cartItem.findUnique({ where: { id: cartItemId } });
if (!item) return;
if (item.cartId !== id) return;
await tx.cartItem.delete({ where: { id: cartItemId } });
});

return getCart();
}