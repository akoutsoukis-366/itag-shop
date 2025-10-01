"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addToCart as addToCartAction } from "@/app/cart/actions";

export default function AddToCartButton({ variantId }: { variantId: string }) {
  const [qty, setQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);

  function onAdd() {
    startTransition(async () => {
      try {
        const res = await addToCartAction({ variantId, quantity: qty });
        // Treat undefined as success to match current action shape
        if (res && res.ok === false) {
          setJustAdded(false);
          return;
        }
        setJustAdded(true);
        // Auto-hide after 2s
        setTimeout(() => setJustAdded(false), 2000);
      } catch {
        setJustAdded(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
          className="w-16 rounded border px-2 py-1"
          aria-label="Quantity"
        />
        <button
          onClick={onAdd}
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {pending ? "Adding..." : "Add to cart"}
        </button>
      </div>

      {/* Lightweight confirmation and navigation */}
      {justAdded && (
        <div className="text-sm text-green-700">
          Added to cart.
          <span className="ml-2 inline-flex gap-2">
            <Link href="/products" className="underline">
              Continue shopping
            </Link>
            <span aria-hidden>·</span>
            <Link href="/cart" className="underline">
              View cart
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}
