
export const dynamic = "force-dynamic";

// DO NOT add "use client" here — keep this as a Server Component
import { saveShippingAndProceed } from "./actions";

export default function CheckoutDetailsPage() {
return (
<div className="mx-auto max-w-xl p-6">
<h1 className="mb-4 text-2xl font-bold">Delivery details</h1>
<form action={saveShippingAndProceed} className="grid gap-4">
<input name="shippingName" placeholder="Full name" required className="rounded border p-2" />
<input name="shippingPhone" placeholder="Phone" className="rounded border p-2" />
<input name="shippingAddr1" placeholder="Address line 1" required className="rounded border p-2" />
<input name="shippingAddr2" placeholder="Address line 2 (optional)" className="rounded border p-2" />
<div className="grid grid-cols-2 gap-3">
<input name="shippingCity" placeholder="City" required className="rounded border p-2" />
<input name="shippingPost" placeholder="Postal code" required className="rounded border p-2" />
</div>
<input name="shippingCountry" defaultValue="GR" placeholder="Country (ISO code)" className="rounded border p-2" />
<button className="mt-2 rounded bg-black px-4 py-2 text-white">Continue to payment</button>
</form>
</div>
);
}