"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addToCartFromForm } from "@/app/cart/actions";

export default function AddToCartClient({ variantId }: { variantId: string }) {
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);

  async function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await addToCartFromForm(formData);
        setOk(true);
      } catch {
        setOk(false);
      }
    });
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      <form action={onSubmit} className="flex items-center gap-3">
        <input type="hidden" name="variantId" value={variantId} />
        <input
          type="number"
          name="quantity"
          min={1}
          defaultValue={1}
          className="w-16 rounded border px-2 py-1"
          aria-label="Quantity"
        />
        <button
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {pending ? "Adding..." : "Add to cart"}
        </button>
      </form>

      {ok && (
        <div className="text-sm text-green-700">
          Added to cart.{" "}
          <span className="ml-2 inline-flex gap-2">
            <Link href="/products" className="underline">Continue shopping</Link>
            <span aria-hidden>·</span>
            <Link href="/cart" className="underline">View cart</Link>
          </span>
        </div>
      )}
    </div>
  );
}
