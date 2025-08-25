    "use client";

import { useMemo, useState } from "react";
import CartRow from "./CartRow";

type Row = { id: string; title: string; unitCents: number; quantity: number; variantId?: string };

export default function CartShell({ rows }: { rows: Row[] }) {
const [list, setList] = useState(rows);

const subtotalCents = useMemo(
() => list.reduce((s, r) => s + r.unitCents * r.quantity, 0),
[list]
);

function handleRowChange(update: { id: string; quantity: number; lineCents: number }) {
setList(prev => prev.map(r => (r.id === update.id ? { ...r, quantity: update.quantity } : r)));
}

function handleRowRemove(id: string) {
setList(prev => prev.filter(r => r.id !== id));
}

return (
<div className="grid gap-6 md:grid-cols-[2fr_1fr]">
<div className="space-y-4">
{list.map(r => (
<CartRow key={r.id} row={r} onChange={handleRowChange} onRemove={handleRowRemove} />
))}
</div>
  <aside className="rounded border p-4">
    <div className="mb-2 flex justify-between">
      <span>Subtotal</span>
      <span>€{(subtotalCents / 100).toFixed(2)}</span>
    </div>
    <form action="/api/checkout" method="POST" className="mt-4">
      <button className="block w-full rounded bg-black px-4 py-2 text-white">Checkout</button>
    </form>
  </aside>
</div>
);
}