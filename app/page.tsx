import { prisma } from "../lib/db";
import Link from "next/link";

export default async function HomePage() {
const products = await prisma.product.findMany({
  where: { status: "ACTIVE" },
  include: { variants: true }, // same as your code, now valid
  take: 3,
});

return (
<div className="space-y-8">
<section className="rounded-lg bg-gray-50 p-8">
<h1 className="text-3xl font-bold">Track what matters</h1>
<p className="mt-2 text-gray-600">Apple Find My–compatible i-tags for keys, wallets, and bags.</p>
<div className="mt-4">
<Link href="/products" className="rounded bg-black px-4 py-2 text-white">Shop now</Link>
</div>
</section>
  <section>
    <h2 className="mb-4 text-2xl font-semibold">Featured</h2>
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
  </section>
</div> 
);
}
