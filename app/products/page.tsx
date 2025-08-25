import { prisma } from "../../lib/db";
import Link from "next/link";

export default async function ProductsPage() {
const products = await prisma.product.findMany({
where: { status: "ACTIVE" },
include: { variants: true },
orderBy: { createdAt: "desc" },
});

return (
<div>
<h1 className="mb-6 text-3xl font-bold">Products</h1>
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {products.map((p) => {
      const min = Math.min(...p.variants.map((v) => v.priceCents));

      return (
        <Link
          key={p.id}
          href={`/products/${p.slug}`}
          className="group rounded border p-4 hover:shadow"
        >
          <div className="aspect-square w-full overflow-hidden rounded bg-gray-100" />
          <div className="mt-3">
            <div className="font-medium">{p.title}</div>
            <div className="text-sm text-gray-600">
              From €{(min / 100).toFixed(2)}
            </div>
          </div>
        </Link>
      );
    })}
  </div>
</div>
);
}