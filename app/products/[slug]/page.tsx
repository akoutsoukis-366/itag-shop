// app/products/[slug]/page.tsx
import { prisma } from "@/lib/db";
import AddToCartClient from "./AddToCartClient";

type Props = { params: Promise<{ slug: string }> };

export default async function ProductPage(props: Props) {
  const { slug } = await props.params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: { ProductImage: true, variants: true },
  });

  if (!product) return <div className="p-6">Not found</div>;

  const images = product.ProductImage ?? [];
  const defaultVariant =
    product.variants.find((v) => v.isDefault) ?? product.variants[0] ?? null;

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold">{product.title}</h1>
      {product.subtitle && <p className="text-gray-600 mt-1">{product.subtitle}</p>}

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          {images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0].url} alt={images[0].alt ?? ""} className="rounded border" />
          ) : (
            <div className="h-64 rounded border bg-gray-50" />
          )}
        </div>

        <div>
          {defaultVariant ? (
            <>
              <div className="text-lg">
                €{(defaultVariant.priceCents / 100).toFixed(2)}{" "}
                <span className="text-sm text-gray-500">
                  VAT {defaultVariant.vatRate.toString()}%
                </span>
              </div>

              {/* Same server action, enhanced with client confirmation */}
              {/* @ts-expect-error Server/Client boundary */}
              <AddToCartClient defaultVariantId={defaultVariant.id} />
            </>
          ) : (
            <div className="text-gray-500">No variants available</div>
          )}

          {product.description && (
            <div className="prose mt-4 whitespace-pre-wrap">{product.description}</div>
          )}
        </div>
      </section>
    </main>
  );
}
