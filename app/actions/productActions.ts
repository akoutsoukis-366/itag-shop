// app/actions/productActions.ts
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface CreateProductData {
  title: string;
  description: string;
  price: string;
  category: string;
  image: string;
  status: string;
}

export async function createProduct(data: CreateProductData) {
  try {
    // Validate required fields
    if (!data.title || !data.price) {
      return {
        success: false,
        error: "Title and price are required"
      };
    }

    // Convert price to number and calculate cents
    const price = parseFloat(data.price);
    if (isNaN(price) || price < 0) {
      return {
        success: false,
        error: "Invalid price format"
      };
    }

    const priceCents = Math.round(price * 100);

    // Generate slug from title
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    // Create product in database
    const product = await prisma.product.create({
      data: {
        title: data.title,
        description: data.description || null,
        slug: slug,
        price: price,
        priceCents: priceCents,
        category: data.category || null,
        image: data.image || null,
        status: data.status || "ACTIVE",
        variants: null // Can be enhanced later
      }
    });

    // Revalidate the products page
    revalidatePath("/admin/products");
    revalidatePath("/products");

    return {
      success: true,
      product: product
    };

  } catch (error) {
    console.error("Error creating product:", error);
    return {
      success: false,
      error: "Failed to create product"
    };
  }
}

export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({
      where: { id }
    });

    revalidatePath("/admin/products");
    revalidatePath("/products");

    return {
      success: true
    };
  } catch (error) {
    console.error("Error deleting product:", error);
    return {
      success: false,
      error: "Failed to delete product"
    };
  }
}
