"use server";

import { prisma } from "../../lib/db";
import { logInfo, logWarn, logError } from "../../lib/log";

// NOTE: In production, protect these actions (e.g., simple password, session check, IP allowlist).
// For now, they are direct server actions for single-tenant/admin usage.

export async function toggleProductStatus(
productId: string,
status: "DRAFT" | "ACTIVE" | "ARCHIVED"
) {
try {
const res = await prisma.product.update({
where: { id: productId },
data: { status },
});
logInfo("Admin: product status updated", { productId, status });
return res;
} catch (e) {
logError("Admin: product status update failed", { productId, status, error: String(e) });
throw e;
}
}

export async function setVariantStock(variantId: string, stockQty: number) {
const qty = Number.isFinite(stockQty) ? Math.max(0, Math.floor(stockQty)) : 0;
try {
const res = await prisma.variant.update({
where: { id: variantId },
data: { stockQty: qty },
});
logInfo("Admin: variant stock updated", { variantId, stockQty: qty });
return res;
} catch (e) {
logError("Admin: variant stock update failed", { variantId, stockQty: qty, error: String(e) });
throw e;
}
}

export async function setVariantPrice(variantId: string, priceCents: number) {
const price = Number.isFinite(priceCents) ? Math.max(0, Math.floor(priceCents)) : 0;
try {
const res = await prisma.variant.update({
where: { id: variantId },
data: { priceCents: price },
});
logInfo("Admin: variant price updated", { variantId, priceCents: price });
return res;
} catch (e) {
logError("Admin: variant price update failed", { variantId, priceCents: price, error: String(e) });
throw e;
}
}