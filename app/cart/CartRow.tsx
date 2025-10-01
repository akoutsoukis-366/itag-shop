"use client";

import { useState, useMemo } from "react";
import { updateCartItemQuantity, removeFromCart } from "./actions";

type Row = {
  id: string;
  title: string;
  unitCents: number;
  quantity: number;
  variantId?: string;
};

export default function CartRow({
  row,
  onChange,
  onRemove,
}: {
  row: Row;
  onChange: (delta: { id: string; quantity: number; lineCents: number }) => void;
  onRemove: (id: string) => void;
}) {
  const [qty, setQty] = useState<number>(row.quantity);
  const [pending, setPending] = useState<boolean>(false);
  const lineCents = useMemo(() => row.unitCents * qty, [row.unitCents, qty]);

  async function applyQuantity(nextQty: number) {
    const clamped = Math.max(0, Math.floor(nextQty));
    const prev = qty;
    setQty(clamped);
    onChange({ id: row.id, quantity: clamped, lineCents: row.unitCents * clamped });

    setPending(true);
    const res = await updateCartItemQuantity({ cartItemId: row.id, quantity: clamped });
    setPending(false);

    if (!res?.ok) {
      // revert on error
      setQty(prev);
      onChange({ id: row.id, quantity: prev, lineCents: row.unitCents * prev });
      return;
    }

    if (clamped === 0) {
      onRemove(row.id);
    }
  }

  async function remove() {
    const prev = qty;
    setQty(0);
    onRemove(row.id);

    setPending(true);
    const res = await removeFromCart({ cartItemId: row.id });
    setPending(false);

    if (!res?.ok) {
      // revert on error
      setQty(prev);
      onChange({ id: row.id, quantity: prev, lineCents: row.unitCents * prev });
    }
  }

  return (
    <div
      className="flex items-center justify-between rounded border p-4 opacity-100"
      aria-busy={pending}
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{row.title}</div>
        <div className="text-sm text-gray-600">
          Unit €{(row.unitCents / 100).toFixed(2)} · Qty {qty} · Line €
          {(lineCents / 100).toFixed(2)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="rounded border px-2 py-1"
          onClick={() => applyQuantity(qty - 1)}
          disabled={pending}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <button
          className="rounded border px-2 py-1"
          onClick={() => applyQuantity(qty + 1)}
          disabled={pending}
          aria-label="Increase quantity"
        >
          +
        </button>
        <button
          className="rounded border px-2 py-1 text-red-600"
          onClick={remove}
          disabled={pending}
          aria-label="Remove item"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
