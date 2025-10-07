"use client";

import * as React from "react";
import Link from "next/link";
import AddToCartClient from "./AddToCartClient";

type Variant = {
  id: string;
  title: string;
  priceCents: number;
  vatRate: any;
  isDefault: boolean;
};

type ProductImage = {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  sort: number;
};

type Product = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  images: string[];
  highlights: string[];
  badges: string[];
  specs: Record<string, unknown> | null;
  faq: Array<{ q: string; a: string }> | null;
  ProductImage: ProductImage[];
  variants: Variant[];
};

async function fetchProduct(slug: string): Promise<Product | null> {
  const res = await fetch(`/api/products/by-slug?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

function euros(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);

  const [product, setProduct] = React.useState<Product | null>(null);
  const [selId, setSelId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    fetchProduct(slug).then((p) => {
      if (!active) return;
      setProduct(p);
      if (p?.variants?.length) {
        const def = p.variants.find((v) => v.isDefault) ?? p.variants[0];
        setSelId(def.id);
      }
    });
    return () => {
      active = false;
    };
  }, [slug]);

  const selVariant = React.useMemo(
    () => product?.variants.find((v) => v.id === selId) ?? null,
    [product, selId]
  );

  const hero =
    (product?.images && product.images[0]) ||
    product?.ProductImage?.[0]?.url ||
    null;

  const gallery = React.useMemo(() => {
    if (!product) return [];
    const list = [
      ...(product.images ?? []),
      ...product.ProductImage.map((pi) => pi.url),
    ].filter(Boolean);
    return Array.from(new Set(list));
  }, [product]);

  if (!product || !selVariant) {
    return <main style={{ padding: 24 }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <nav style={{ marginBottom: 16 }}>
        <Link href="/">Hyperloq</Link> {" / "}
        <Link href="/products">Products</Link> {" / "}
        <span>{product.title}</span>
      </nav>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          {hero ? (
            <img
              src={hero}
              alt={product.ProductImage?.[0]?.alt ?? product.title}
              style={{ width: "100%", maxWidth: 520, height: "auto", borderRadius: 8 }}
            />
          ) : null}

          {gallery.length > 1 ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {gallery.map((src, i) => (
                <img
                  key={src + i}
                  src={src}
                  alt={`Gallery ${i + 1}`}
                  style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <h1 style={{ margin: "0 0 8px" }}>{product.title}</h1>
          {product.subtitle ? (
            <p style={{ margin: "0 0 12px", color: "#444" }}>{product.subtitle}</p>
          ) : null}

          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{euros(selVariant.priceCents)}</div>
            <div style={{ fontSize: 12, color: "#666" }}>VAT {Number(selVariant.vatRate ?? 24)}%</div>
          </div>

          {product.variants.length > 1 ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Options</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {product.variants.map((v) => {
                  const active = v.id === selId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelId(v.id)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: active ? "2px solid #111" : "1px solid #ccc",
                        background: active ? "#fafafa" : "#fff",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                      aria-pressed={active}
                    >
                      {v.title}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Add to cart via server action */}
          <AddToCartClient variantId={selVariant.id} />

          {product.description ? (
            <div style={{ marginTop: 16, lineHeight: 1.5 }}>{product.description}</div>
          ) : null}

          {product.badges?.length ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {product.badges.map((b, i) => (
                <span key={i} style={{ fontSize: 12, background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "4px 8px", borderRadius: 999 }}>
                  {b}
                </span>
              ))}
            </div>
          ) : null}

          {product.specs ? (
            <div style={{ marginTop: 16 }}>
              <h3>Specifications</h3>
              <dl>
                {Object.entries(product.specs as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, padding: "6px 0", borderBottom: "1px solid #eee" }}>
                    <dt style={{ fontWeight: 600 }}>{k}</dt>
                    <dd style={{ margin: 0 }}>{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </section>

      {Array.isArray(product.faq) && product.faq.length > 0 ? (
        <section style={{ marginTop: 32 }}>
          <h2>FAQ</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {product.faq.map((f, i) => (
              <details key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>{f.q}</summary>
                <div style={{ marginTop: 8 }}>{f.a}</div>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
