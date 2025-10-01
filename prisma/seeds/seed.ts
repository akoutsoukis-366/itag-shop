import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create categories
  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories'
    }
  })

  // Create sample products
  await prisma.product.create({
    data: {
      name: 'NeoTag Classic - Black 1-pack',
      slug: 'neotag-classic-black-1-pack',
      description: 'Smart tracking device',
      price: 2499, // €24.99 in cents
      sku: 'NTC-BLK-1',
      categoryId: electronics.id,
      inventory: 100,
      images: ['/images/neotag-black.jpg']
    }
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
