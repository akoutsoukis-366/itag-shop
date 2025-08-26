import { NextResponse } from "next/server"; // Route Handler utilities
import { cookies } from "next/headers"; // Server-side cookie API

export async function GET(req: Request) {
const url = new URL(req.url); // current request URL

const sid = url.searchParams.get("session_id") || ""; // session id

const jar = await cookies(); // cookie jar

// Delete cart_id robustly

jar.delete("cart_id"); // framework delete
jar.set("cart_id", "", {
path: "/", // match original path
httpOnly: true, // mirror original
sameSite: "lax", // mirror original
secure: false, // localhost; use true on HTTPS
expires: new Date(0),
maxAge: 0,
}); //

// IMPORTANT: backticks here ↓↓↓
const back = new URL(`/checkout/success?session_id=${encodeURIComponent(sid)}`, url.origin); //

return NextResponse.redirect(back); // 302
}