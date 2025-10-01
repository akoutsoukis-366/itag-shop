"use client";

import { useMemo } from "react";
import CartRow from "./CartRow";

type Row = {
  id: string;
  title: string;
  unitCents: number;
  quantity: number;
  variantId?: string;
};

function formatEUR(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export default function CartShell({ rows }: { rows: Row[] }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  const subtotalCents = useMemo(
    () => safeRows.reduce((sum, r) => sum + r.unitCents * r.quantity, 0),
    [safeRows]
  );

  // CartRow already calls server actions; callbacks are required by its props
  const onChange = (_: { id: string; quantity: number; lineCents: number }) => {};
  const onRemove = (_: string) => {};

  return (
    <div className="space-y-6">
      <div className="divide-y rounded border">
        {safeRows.map((r) => (
          <CartRow key={r.id} row={r} onChange={onChange} onRemove={onRemove} />
        ))}
      </div>

      <div className="flex items-center justify-end gap-6">
        <div className="text-lg font-semibold">Subtotal</div>
        <div className="text-lg">{formatEUR(subtotalCents)}</div>
      </div>

      <div className="flex justify-end">
        <a
          href="/checkout/details"
          className="rounded bg-black px-6 py-3 text-white disabled:opacity-60"
          aria-disabled={safeRows.length === 0}
        >
          Checkout
        </a>
      </div>
    </div>
  );
}
