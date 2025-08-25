import { NextResponse } from "next/server"; // Route handlers must export named methods in App Router, not a default export.
import { cookies } from "next/headers"; // In Next 15, cookies() must be awaited before use.
import { prisma } from "../../../../lib/db"; // Prisma client import for DB access.
import Stripe from "stripe"; // Stripe SDK for session creation.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" }); // Initialize Stripe with the configured API version.

export async function POST() { // Handle POST from the cart form.

try { // Wrap in try/catch to redirect on failure.
const store = await cookies(); // Await cookies() per Next 15 dynamic APIs.
const cartId = store.get("cart_id")?.value || null; // Read the cart_id cookie used across the app.
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"; // Use public base URL or default to localhost for dev
if (!cartId) { // If there is no cart cookie, consider the cart empty.[2]
  return NextResponse.redirect(new URL("/cart?err=empty", baseUrl), { status: 303 }); // Redirect back to cart with an empty error using 303 See Other.[3]
} // End empty cookie branch.[3]

const cart = await prisma.cart.findUnique({ // Load the cart and its items for session creation.[2]
  where: { id: cartId }, // Lookup by the cookie-provided cart id.[2]
  include: { // Include items and product details for constructing line item names.[2]
    items: { // Adjust to cartItems if schema uses a different relation name.[2]
      include: { variant: { include: { product: true } } }, // Include variant and product titles.[2]
    }, // End items include.[2]
  }, // End include.[2]
}); // End cart query.[2]

if (!cart || cart.items.length === 0) { // If no cart or zero items, treat as empty. [2]
  return NextResponse.redirect(new URL("/cart?err=empty", baseUrl), { status: 303 }); // Redirect back to cart with empty flag.[3]
} // End empty cart branch.[3]

const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.items.map((it: any) => { // Map cart items to Stripe line items.[3]
  const title = (it.variant?.product?.title ?? "Product") + (it.variant?.title ? " — " + it.variant.title : ""); // Build product display name.[3]
  const unit = Number(it.unitCents ?? it.variant?.priceCents ?? 0); // Use snapshot unitCents if set, else fallback to variant price.[3]
  const qty = Math.max(1, Number(it.quantity ?? 1)); // Clamp quantity to at least 1 for Stripe.[3]
  return { // Return Stripe line item definition.[3]
    quantity: qty, // Quantity for the item.[3]
    price_data: { // Inline price setup to avoid pre-created Prices.[3]
      currency: "eur", // Use EUR; change if multi-currency is needed.[3]
      unit_amount: unit, // Amount in cents.[3]
      product_data: { name: title }, // Product name shown in Stripe Checkout.[3]
    }, // End price_data.[3]
  }; // End line item.[3]
}); // End mapping.[3]

const session = await stripe.checkout.sessions.create({ // Create the Stripe Checkout Session.[3]
  mode: "payment", // One-time payment mode.[3]
  line_items, // Pass constructed line items.[3]
  success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`, // Success redirection to site.[3]
  cancel_url: `${baseUrl}/cart`, // Cancel back to cart.[3]
  metadata: { cart_id: cart.id }, // Store cart id for webhook reconciliation.[3]
}); // End session creation.[3]

return NextResponse.redirect(session.url!, { status: 303 }); // Redirect user agent to Stripe with 303 See Other.[3]
} catch (e: any) { // Catch any error and return a safe redirect.
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"; // Determine base URL for redirection.
return NextResponse.redirect(
  new URL(`/cart?err=${encodeURIComponent(e?.message ?? "checkout_failed")}`, baseUrl),
  { status: 303 },
);
 // End redirect.
} // End catch.
} // End POST.

export async function GET() { // Optional GET for direct browser navigation during testing.

return POST(); // Reuse the POST logic so both methods behave consistently in dev.
} // End GET.