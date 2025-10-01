// app/cart/page.tsx
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import CartShell from "./CartShell";

async function getCartServer() {
  const store = await cookies();
  const id = store.get("cart_id")?.value || null;
  if (!id) return { id: null as string | null, items: [] as any[] };

  const cart = await prisma.cart.findUnique({
    where: { id },
    include: {
      CartItem: {
        include: {
          Variant: { include: { Product: true } },
        },
      },
    },
  });

  const items =
    cart?.CartItem.map((it) => ({
      id: String(it.id),
      title:
        (it.Variant?.Product?.title ?? "Product") +
        (it.Variant?.title ? " — " + it.Variant.title : ""),
      unitCents:
        typeof it.unitCents === "number" ? it.unitCents : it.Variant?.priceCents ?? 0,
      quantity: Number(it.quantity ?? 0),
      variantId: it.Variant?.id,
    })) ?? [];

  return { id: cart?.id ?? id, items };
}

export default async function CartPage() {
  const cart = await getCartServer();
  const rows = Array.isArray(cart.items) ? cart.items : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Cart</h1>
      {!cart.id || rows.length === 0 ? (
        <div className="rounded border p-6 text-gray-600">Cart is empty.</div>
      ) : (
        <CartShell rows={rows} />
      )}
    </div>
  );
}
