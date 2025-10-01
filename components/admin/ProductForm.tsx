// components/admin/ProductForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/lib/actions/products";

type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export default function ProductForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [f, setF] = useState({
    title: "",
    subtitle: "",
    description: "",
    status: "DRAFT" as ProductStatus,
    category: "i-tags",
    brand: "Hyperloq",
    seoTitle: "",
    seoDesc: "",
    // quick image
    imageUrl: "",
    imageAlt: "",
    // quick variant
    variantTitle: "",
    sku: "",
    priceCents: 0,
    currency: "EUR",
    vatRate: 24.0,
    stockQty: 0,
    isDefault: true,
    color: "",
    packSize: 1,
    weightGrams: 0,
  });

  const set = <K extends keyof typeof f,>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const res = await createProduct({
      title: f.title.trim(),
      subtitle: f.subtitle.trim() || null,
      description: f.description.trim() || null,
      status: f.status,
      category: f.category.trim(),
      brand: f.brand.trim() || null,
      seoTitle: f.seoTitle.trim() || null,
      seoDesc: f.seoDesc.trim() || null,
      image: f.imageUrl.trim()
        ? { url: f.imageUrl.trim(), alt: f.imageAlt.trim() || null }
        : null,
      variant:
        f.sku.trim() && f.variantTitle.trim()
          ? {
              title: f.variantTitle.trim(),
              sku: f.sku.trim(),
              priceCents: Number(f.priceCents) || 0,
              currency: f.currency,
              vatRate: Number(f.vatRate) as unknown as number, // stored as Decimal by Prisma
              stockQty: Number(f.stockQty) || 0,
              isDefault: !!f.isDefault,
              color: f.color.trim() || null,
              packSize: Number(f.packSize) || null,
              weightGrams: Number(f.weightGrams) || null,
            }
          : null,
    });

    setBusy(false);

    if (!res.ok) {
      alert(res.error || "Failed to create product");
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Title *</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Subtitle</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={f.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Description</label>
          <textarea
            className="mt-1 w-full rounded border px-3 py-2"
            rows={4}
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Status</label>
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={f.status}
            onChange={(e) =>
              set("status", e.target.value as ProductStatus)
            }
          >
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Category</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={f.category}
            onChange={(e) => set("category", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Brand</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={f.brand}
            onChange={(e) => set("brand", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">SEO Title</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={f.seoTitle}
            onChange={(e) => set("seoTitle", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">SEO Description</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={f.seoDesc}
            onChange={(e) => set("seoDesc", e.target.value)}
          />
        </div>
      </div>

      <fieldset className="rounded border p-4">
        <legend className="px-2 text-sm font-semibold">Quick variant</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Variant title</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={f.variantTitle}
              onChange={(e) => set("variantTitle", e.target.value)}
              placeholder="e.g., Black 1‑pack"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">SKU</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={f.sku}
              onChange={(e) => set("sku", e.target.value)}
              placeholder="NTC-BLK-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Price (cents)</label>
            <input
              type="number"
              className="mt-1 w-full rounded border px-3 py-2"
              value={f.priceCents}
              onChange={(e) => set("priceCents", Number(e.target.value || 0))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">VAT rate</label>
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded border px-3 py-2"
              value={f.vatRate}
              onChange={(e) => set("vatRate", Number(e.target.value || 24))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Stock qty</label>
            <input
              type="number"
              className="mt-1 w-full rounded border px-3 py-2"
              value={f.stockQty}
              onChange={(e) => set("stockQty", Number(e.target.value || 0))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Color</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={f.color}
              onChange={(e) => set("color", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Pack size</label>
            <input
              type="number"
              className="mt-1 w-full rounded border px-3 py-2"
              value={f.packSize}
              onChange={(e) => set("packSize", Number(e.target.value || 1))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Weight (g)</label>
            <input
              type="number"
              className="mt-1 w-full rounded border px-3 py-2"
              value={f.weightGrams}
              onChange={(e) =>
                set("weightGrams", Number(e.target.value || 0))
              }
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded border p-4">
        <legend className="px-2 text-sm font-semibold">Quick image</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Image URL</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={f.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Alt</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={f.imageAlt}
              onChange={(e) => set("imageAlt", e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {busy ? "Creating..." : "Create product"}
        </button>
        <button
          type="button"
          className="rounded bg-gray-200 px-4 py-2"
          onClick={() => history.back()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
