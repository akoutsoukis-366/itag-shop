
import Link from "next/link";
import ProductForm from "@/components/admin/ProductForm";

export default function AdminNewProductPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/products" className="text-blue-600 hover:underline">
          ← Back to products
        </Link>
        <h1 className="text-2xl font-semibold">Create product</h1>
      </div>

      <section className="rounded border bg-white p-6 shadow-sm">
        <ProductForm />
      </section>
    </main>
  );
}
