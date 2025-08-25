"use server";

import { cookies } from "next/headers";

export async function clearCartCookies() {
const c = await cookies();
c.delete("cart_id");
c.delete("cart_sig");
}