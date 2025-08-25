import { prisma } from "../../lib/db";
import { cookies } from "next/headers";
import CartShell from "./CartShell";

async function getCartServer() {
const store = await cookies();
const id = store.get("cart_id")?.value || null;
if (!id) return { id: null as string | null, items: [] as any[] };

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
return cart ?? { id, items: [] };
}

function toRow(it: any) {
const title =
(it.variant?.product?.title ?? "Product") +
(it.variant?.title ? " — " + it.variant.title : "");
const unitCents =
typeof it.unitCents === "number" ? it.unitCents : (it.variant?.priceCents ?? 0);
return {
id: String(it.id),
title,
unitCents,
quantity: Number(it.quantity ?? 0),
variantId: it.variantId as string | undefined,
};
}

export default async function CartPage() {
const cart = await getCartServer();
const rows = (cart.items ?? []).map(toRow);

return (
<div className="mx-auto max-w-4xl px-4 py-8">
<h1 className="mb-6 text-3xl font-bold">Cart</h1>
{(!cart.id || rows.length === 0) ? (
<div className="rounded border p-6 text-gray-600">Cart is empty.</div>
) : (
<CartShell rows={rows} />
)}
</div>
);
}