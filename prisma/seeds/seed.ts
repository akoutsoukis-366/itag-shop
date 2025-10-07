
// prisma/seeds/seed.ts
import { PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  // Product: Hyperloq NeoTag Classic
  const slug = "neotag-classic";

  const product = await prisma.product.upsert({
    where: { slug },
    update: {
      title: "Hyperloq NeoTag Classic",
      subtitle: "Smart GPS tracker with Apple Find My & Android Find My",
      description:
        "Το NeoTag Classic είναι ένα έξυπνο GPS tracker που συνδέεται στο αντικείμενό σας και σας βοηθά να το εντοπίσετε εύκολα μέσω του Apple Find My ή Android Find My. Μακράς διάρκειας μπαταρία, ανθεκτική κατασκευή και απλή εμπειρία χρήσης.",
      status: ProductStatus.ACTIVE,
      category: "i-tags",
      brand: "Hyperloq",
      specs: {
        chipset: "Bluetooth LE",
        battery: "CR2032 (έως 1 έτος)",
        compatibility: ["Apple Find My", "Android Find My"],
        water_resistance: "IPX4",
        weight: "10g",
      },
      seoTitle: "Hyperloq NeoTag Classic | Smart Tracker",
      seoDesc:
        "Βρείτε εύκολα τα αντικείμενά σας με το NeoTag Classic. Συμβατό με Apple Find My & Android Find My.",
      images: [
        "https://www.amazon.co.uk/iTagPro-Tracker-Replaceable-Backpack-Suitcase-Black/dp/B0F92JCMCW?th=1",
        "https://cdn.example.com/neo-tag/hero-2.jpg",
        "https://cdn.example.com/neo-tag/hero-3.jpg",
      ],
      highlights: [
        "Works with Apple Find My",
        "Android Find My compatible",
        "Up to 1-year battery life",
      ],
      badges: ["Free shipping over €50", "14-day returns"],
      faq: [
        { q: "Δουλεύει με iPhone;", a: "Ναι, μέσω του δικτύου Apple Find My." },
        { q: "Διάρκεια μπαταρίας;", a: "Έως 1 έτος, χρησιμοποιεί μπαταρία CR2032." },
        { q: "Είναι αδιάβροχο;", a: "Προστασία IPX4 για πιτσιλίσματα." },
      ],
      canonicalUrl: "https://your-domain.com/products/neotag-classic",
      updatedAt: now,
    },
    create: {
      slug,
      title: "Hyperloq NeoTag Classic",
      subtitle: "Smart GPS tracker with Apple Find My & Android Find My",
      description:
        "Το NeoTag Classic είναι ένα έξυπνο GPS tracker που συνδέεται στο αντικείμενό σας και σας βοηθά να το εντοπίσετε εύκολα μέσω του Apple Find My ή Android Find My. Μακράς διάρκειας μπαταρία, ανθεκτική κατασκευή και απλή εμπειρία χρήσης.",
      status: ProductStatus.ACTIVE,
      category: "i-tags",
      brand: "Hyperloq",
      specs: {
        chipset: "Bluetooth LE",
        battery: "CR2032 (έως 1 έτος)",
        compatibility: ["Apple Find My", "Android Find My"],
        water_resistance: "IPX4",
        weight: "10g",
      },
      seoTitle: "Hyperloq NeoTag Classic | Smart Tracker",
      seoDesc:
        "Βρείτε εύκολα τα αντικείμενά σας με το NeoTag Classic. Συμβατό με Apple Find My & Android Find My.",
      images: [
        "https://raw.githubusercontent.com/s4ysolutions/itag/master/assets/itag_black.svg?sanitize=true",
        "https://cdn.example.com/neo-tag/hero-2.jpg",
        "https://cdn.example.com/neo-tag/hero-3.jpg",
      ],
      highlights: [
        "Works with Apple Find My",
        "Android Find My compatible",
        "Up to 1-year battery life",
      ],
      badges: ["Free shipping over €50", "14-day returns"],
      faq: [
        { q: "Δουλεύει με iPhone;", a: "Ναι, μέσω του δικτύου Apple Find My." },
        { q: "Διάρκεια μπαταρίας;", a: "Έως 1 έτος, χρησιμοποιεί μπαταρία CR2032." },
        { q: "Είναι αδιάβροχο;", a: "Προστασία IPX4 για πιτσιλίσματα." },
      ],
      canonicalUrl: "https://your-domain.com/products/neotag-classic",
      ProductImage: {
        create: [
          {
            id: "img-neotag-1",
            url: "https://cdn.example.com/neo-tag/gallery-1.jpg",
            alt: "NeoTag Classic front",
            width: 1200,
            height: 1200,
            sort: 0,
          },
          {
            id: "img-neotag-2",
            url: "https://cdn.example.com/neo-tag/gallery-2.jpg",
            alt: "NeoTag Classic back",
            width: 1200,
            height: 1200,
            sort: 1,
          },
        ],
      },
      variants: {
        create: [
          {
            id: "var-neotag-1",
            sku: "NTC-WHT-1",
            title: "NeoTag Classic - White 1-pack",
            color: "White",
            packSize: 1,
            priceCents: 1499,
            compareAtCents: 2499,
            stockQty: 100,
            isDefault: true,
            media: ["https://cdn.example.com/neo-tag/1pack-1.jpg"],
            badge: "Popular",
            attr: { color: "White", pack: "1" },
            currency: "EUR",
            vatRate: 24.0,
            weightGrams: 10,
            updatedAt: now,
          },
          {
            id: "var-neotag-2",
            sku: "NTC-WHT-2",
            title: "NeoTag Classic - White 2-pack",
            color: "White",
            packSize: 2,
            priceCents: 2899,
            compareAtCents: 4999,
            stockQty: 80,
            isDefault: false,
            media: ["https://cdn.example.com/neo-tag/2pack-1.jpg"],
            badge: "Best value",
            attr: { color: "White", pack: "2" },
            currency: "EUR",
            vatRate: 24.0,
            weightGrams: 20,
            updatedAt: now,
          },
          {
            id: "var-neotag-4",
            sku: "NTC-WHT-4",
            title: "NeoTag Classic - White 4-pack",
            color: "White",
            packSize: 4,
            priceCents: 4899,
            compareAtCents: 9999,
            stockQty: 50,
            isDefault: false,
            media: ["https://cdn.example.com/neo-tag/4pack-1.jpg"],
            badge: "Bundle",
            attr: { color: "White", pack: "4" },
            currency: "EUR",
            vatRate: 24.0,
            weightGrams: 40,
            updatedAt: now,
          },
        ],
      },
      updatedAt: now,
    },
  });

  // Ensure exactly one default variant
  const pv = await prisma.variant.findMany({ where: { productId: product.id } });
  if (!pv.some((v) => v.isDefault)) {
    await prisma.variant.update({
      where: { id: pv[0].id },
      data: { isDefault: true, updatedAt: new Date() },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
