import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
console.log("Seeding minimal data...");

await prisma.orderItem.deleteMany().catch(() => {});
await prisma.order.deleteMany().catch(() => {});
await prisma.cartItem.deleteMany().catch(() => {});
await prisma.cart.deleteMany().catch(() => {});
await prisma.productImage.deleteMany().catch(() => {});
await prisma.variant.deleteMany().catch(() => {});
await prisma.product.deleteMany().catch(() => {});

const product = await prisma.product.create({
data: {
slug: "neotag-classic",
title: "NeoTag Classic",
subtitle: "Smart item tracker for everyday essentials",
description: "Apple Find My compatible tracker.",
status: "ACTIVE",
specs: { waterproof: "splash resistant" } as any,
images: {
create: [
{ url: "/images/classic-1.jpg", alt: "NeoTag Classic front", sort: 0 }
]
},
variants: {
create: [
{
sku: "NTC-BLK-1",
title: "Black 1-pack",
color: "black",
packSize: 1,
priceCents: 2499,
currency: "EUR",
vatRate: 24.0,
stockQty: 100,
isDefault: true
},
{
sku: "NTC-BLK-2",
title: "Black 2-pack",
color: "black",
packSize: 2,
priceCents: 4699,
currency: "EUR",
vatRate: 24.0,
stockQty: 80
}
]
}
},
include: { variants: true }
});

console.log("Created product: " + product.title + " (" + product.variants.length + " variants)");
console.log("Seed complete.");
}

main()
.catch((e) => {
console.error("Seed failed:", e);
process.exit(1);
})
.finally(async () => {
await prisma.$disconnect();
});