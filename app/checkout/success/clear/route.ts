import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
const url = new URL(req.url);
const sid = url.searchParams.get("session_id") || "";

const jar = await cookies();

// 1) Remove the existing cart cookie (robust: delete + expired overwrite)
jar.delete("cart_id");
jar.set("cart_id", "", {
path: "/",
httpOnly: true,
sameSite: "lax",
secure: false, // set true in production over HTTPS
expires: new Date(0),
maxAge: 0,
});

// 2) Set a short-lived flag so the success page doesn’t immediately recreate a cart
jar.set("just_paid", "1", {
path: "/",
httpOnly: true, // server-only; flip to false if a client component must read it
sameSite: "lax",
secure: false, // set true in production over HTTPS
maxAge: 60, // 60 seconds is enough to cover the success view
});

// 3) Redirect back to the success page with the same session id
const back = new URL(`/checkout/success?session_id=${encodeURIComponent(sid)}`, url.origin);
return NextResponse.redirect(back);
}