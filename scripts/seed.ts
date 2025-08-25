import { prisma } from "../lib/db";

async function main() {
// Basic product with two variants
const p = await prisma.product.create({
data: {
title: "Classic Tee",
slug: "classic-tee",
description: "Soft cotton tee",
published: true,
variants: {
create: [
{ title: "Small", sku: "TEE-S", priceCents: 1500, currency: "EUR", stockQty: 50, vatRate: 24 },
{ title: "Medium", sku: "TEE-M", priceCents: 1500, currency: "EUR", stockQty: 50, vatRate: 24 },
],
},
},
include: { variants: true },
});

console.log("Seeded product:", p.title, p.variants.map(v => v.sku));
}

main().catch((e) => {
console.error(e);
process.exit(1);
}).finally(async () => {
await prisma.$disconnect();
});