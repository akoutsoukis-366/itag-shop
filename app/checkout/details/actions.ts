"use server"; // keep actions in a separate server module

import { cookies } from "next/headers";

import { prisma } from "../../../lib/db";
import { redirect } from "next/navigation";

export async function saveShippingAndProceed(formData: FormData) {

const store = await cookies();
const cartId = store.get("cart_id")?.value || null;
if (!cartId) {
redirect("/cart?err=empty");
}

const shippingName = String(formData.get("shippingName") || "");
const shippingPhone = String(formData.get("shippingPhone") || "");
const shippingAddr1 = String(formData.get("shippingAddr1") || "");
const shippingAddr2 = String(formData.get("shippingAddr2") || "");
const shippingCity = String(formData.get("shippingCity") || "");
const shippingPost = String(formData.get("shippingPost") || "");
const shippingCountry = String(formData.get("shippingCountry") || "GR");

// Persist on Cart so webhook can prefer these values

await prisma.cart.update({
where: { id: cartId },
data: {
shippingName,
shippingPhone: shippingPhone || null,
shippingAddr1,
shippingAddr2: shippingAddr2 || null,
shippingCity,
shippingPost,
shippingCountry,
},
});
// Proceed to create Stripe Checkout Session
redirect("/api/checkout/session");
}