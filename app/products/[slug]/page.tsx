import { prisma } from "../../../lib/db";
import { notFound } from "next/navigation";
import { addToCartFromForm } from "../../cart/actions";

// Opt out of the Full Route Cache so manual DB changes show immediately.
export const dynamic = "force-dynamic";

// If preferred, you can use ISR-style: export const revalidate = 0;
// or a timed revalidate: export const revalidate = 60;

type PageParams = { slug: string };

export default async function ProductPage(props: { params: Promise<PageParams> }) {
// Next 15: params is async
const { slug } = await props.params;

const product = await prisma.product.findUnique({
where: { slug },
include: { images: true, variants: true },
});

// Guard: only show ACTIVE products with at least one variant
if (!product || product.status !== "ACTIVE") return notFound();

if (!product.variants.length) return notFound();

const defaultVariant = product.variants.find((v: any) => v.isDefault) ?? product.variants;

return (
<div className="grid gap-8 md:grid-cols-2">
<div>
<div className="aspect-square w-full rounded bg-gray-100" />
</div>
<div>
<h1 className="text-3xl font-bold">{product.title}</h1>
{product.subtitle ? <p className="mt-2 text-gray-600">{product.subtitle}</p> : null}
    <div className="mt-4 text-2xl font-semibold">
      €{((defaultVariant as any).priceCents / 100).toFixed(2)}
    </div>

    <form action={addToCartFromForm} className="mt-6">
      <input type="hidden" name="variantId" value={(defaultVariant as any).id} />
      <input type="hidden" name="quantity" value="1" />
      <button className="w-full rounded bg-black px-4 py-2 text-white">Add to cart</button>
    </form>
  </div>
</div>
);
}