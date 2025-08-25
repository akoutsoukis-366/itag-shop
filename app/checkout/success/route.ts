import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
const c = await cookies();
// Clear cart cookies on success
c.delete("cart_id");
c.delete("cart_sig");

// Return a simple HTML confirmation page
const html = `<!doctype html>
<html> <head> <meta charset="utf-8" /> <meta name="viewport" content="width=device-width, initial-scale=1" /> <title>Payment received</title> <style> body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, "Apple Color Emoji", "Segoe UI Emoji"; padding: 2rem; max-width: 48rem; margin: 0 auto; color:#111827; } p { color:#4b5563; } a.btn { display:inline-block; background:#000; color:#fff; padding:0.75rem 1.25rem; border-radius:0.375rem; text-decoration:none; } .wrap { padding-top: 2rem; } h1 { font-size: 1.875rem; margin-bottom: 0.75rem; } </style> </head> <body> <div class="wrap"> <h1>Payment received</h1> <p>Thanks! Your order has been recorded. A confirmation email will follow.</p> <div style="margin-top: 1.5rem;"> <a class="btn" href="/">Continue shopping</a> </div> </div> </body> </html>`;

return new NextResponse(html, {
headers: { "content-type": "text/html; charset=utf-8" },
});
}