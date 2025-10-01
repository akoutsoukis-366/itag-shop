// components/CartBadge.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CartBadge() {
  const [count, setCount] = useState<number | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/cart/count", { cache: "no-store" });
      const data = await res.json();
      setCount(Number(data?.count ?? 0));
    } catch {
      setCount(null);
    }
  }

  useEffect(() => {
    refresh();
    const vis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  return (
    <Link href="/cart" className="relative inline-flex items-center gap-2 rounded px-3 py-2 hover:bg-gray-50">
      <span>Cart</span>
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-xs text-white">
        {count ?? "—"}
      </span>
    </Link>
  );
}
