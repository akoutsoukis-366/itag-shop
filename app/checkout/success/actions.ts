"use server";

import { cookies } from "next/headers";

import { prisma } from "../../../lib/db";

// Clears cart_id only if an Order with this session exists
export async function clearCartCookieIfOrderExists(formData: FormData) {
const sessionId = String(formData.get("sessionId") || "");

if (!sessionId) return false;
const exists = await prisma.order.findFirst({
where: { stripeSessionId: sessionId },
select: { id: true },
});
if (!exists) return false;
const jar = await cookies();
jar.set("cart_id", "", { path: "/", maxAge: 0 });
return true;


}

// Loads the order and its line items for the success page UI
export async function loadOrderForSuccess(sessionId: string) {
if (!sessionId) return null;

return prisma.order.findFirst({
where: { stripeSessionId: sessionId },
include: { lineItems: true },
});
}