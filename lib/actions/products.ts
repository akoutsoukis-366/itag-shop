// lib/actions/products.ts
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export async function createProduct(input: {
  title: string;
  subtitle: string | null;
  description: string | null;
  status: ProductStatus;
  category: string;
  brand: string | null;
  seoTitle: string | null;
  seoDesc: string | null;
  image: { url: string; alt: string | null } | null;
  variant:
    | {
        title: string;
        sku: string;
        priceCents: number;
        currency: string;
        vatRate: number;
        stockQty: number;
        isDefault: boolean;
        color: string | null;
        packSize: number | null;
        weightGrams: number | null;
      }
    | null;
}) {
  try {
    if (!input.title?.trim()) return { ok: false, error: "Title is required" };

    const slug = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const created = await prisma.product.create({
      data: {
        slug,
        title: input.title,
        subtitle: input.subtitle,
        description: input.description,
        status: input.status,
        category: input.category || "i-tags",
        brand: input.brand ?? "Hyperloq",
        seoTitle: input.seoTitle,
        seoDesc: input.seoDesc,

        ProductImage: input.image
          ? {
              create: {
                id: crypto.randomUUID(),
                url: input.image.url,
                alt: input.image.alt,
                sort: 0,
              },
            }
          : undefined,

        variants: input.variant
          ? {
              create: {
                id: crypto.randomUUID(),
                title: input.variant.title,
                sku: input.variant.sku,
                priceCents: input.variant.priceCents,
                currency: input.variant.currency,
                vatRate: input.variant.vatRate,
                stockQty: input.variant.stockQty,
                isDefault: input.variant.isDefault,
                color: input.variant.color ?? undefined,
                packSize: input.variant.packSize ?? undefined,
                weightGrams: input.variant.weightGrams ?? undefined,
                createdAt: new Date(),         // explicit because required
                updatedAt: new Date(),         // explicit because required
              },
            }
          : undefined,
      },
      include: { ProductImage: true, variants: true },
    });

    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { ok: true, productId: created.id, slug: created.slug };
  } catch (e: any) {
    console.error("createProduct error:", e);
    const msg =
      e?.code === "P2002"
        ? "Unique constraint failed (slug or SKU exists)"
        : "Failed to create product";
    return { ok: false, error: msg };
  }
}
