import { headers } from "next/headers";
import Link from "next/link";

async function getProducts() {
const h = await headers();
const origin = `${h.get("x-forwarded-proto") || "http"}://${h.get("x-forwarded-host") || h.get("host")}`;
const res = await fetch(`${origin}/api/admin/products`, { cache: "no-store" });
if (!res.ok) throw new Error("Failed to load products");
return res.json();
}

export default async function AdminProductsPage() {
const products = await getProducts();
return (
<main>
<h1>Products</h1>
<Link href="/admin/products/new">New product</Link>
<table>
<thead>
<tr><th>Title</th><th>Status</th><th>Variants</th><th></th></tr>
</thead>
<tbody>
{products.map((p: any) => (
<tr key={p.id}>
<td>{p.title}</td>
<td>{p.status}</td>
<td>{p.variants?.length ?? 0}</td>
<td><Link href={`/admin/products/${p.id}`}>Edit</Link></td>
</tr>
))}
</tbody>
</table>
</main>
);
}