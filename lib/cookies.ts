"use server";

import { cookies } from "next/headers";
import { randomUUID, createHash, timingSafeEqual } from "crypto";

const CART_COOKIE = "cart_id";
const SIGN_COOKIE = "cart_sig";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days

function sign(value: string, secret: string) {
const h = createHash("sha256").update(value + "." + secret).digest("base64url");
return h;
}

function safeEqual(a: string, b: string) {
const ab = Buffer.from(a);
const bb = Buffer.from(b);
if (ab.length !== bb.length) return false;
return timingSafeEqual(ab, bb);
}

export async function getCartId(): Promise<string | null> {
const store = await cookies();
const id = store.get(CART_COOKIE)?.value ?? null;
const sig = store.get(SIGN_COOKIE)?.value ?? null;
const secret = process.env.COOKIE_SIGNING_SECRET;
if (!id || !sig || !secret) return null;
const expected = sign(id, secret);
if (!safeEqual(sig, expected)) return null;
return id;
}

export async function setCartId(id?: string): Promise<string> {
const store = await cookies();
const secret = process.env.COOKIE_SIGNING_SECRET;
const cartId = id ?? randomUUID();
if (!secret) {
throw new Error("Missing COOKIE_SIGNING_SECRET");
}
const signature = sign(cartId, secret);

const options = {
httpOnly: true as const,
secure: true as const,
sameSite: "lax" as const,
path: "/",
maxAge: MAX_AGE,
};

store.set(CART_COOKIE, cartId, options);
store.set(SIGN_COOKIE, signature, options);
return cartId;
}

export async function clearCartId() {
const store = await cookies();
store.delete(CART_COOKIE);
store.delete(SIGN_COOKIE);
}