// app/checkout/details/page.tsx
import { startCheckout } from "./actions";

export default function CheckoutDetailsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Checkout</h1>

      <form action={startCheckout} className="grid gap-6 max-w-xl">
        {/* Contact */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="w-full rounded border px-3 py-2" />
        </div>

        {/* Shipping */}
        <div className="grid gap-3">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="shippingName">Full name</label>
            <input id="shippingName" name="shippingName" required className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="shippingPhone">Phone</label>
            <input id="shippingPhone" name="shippingPhone" className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="shippingAddr1">Address line 1</label>
            <input id="shippingAddr1" name="shippingAddr1" required className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="shippingAddr2">Address line 2</label>
            <input id="shippingAddr2" name="shippingAddr2" className="w-full rounded border px-3 py-2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="shippingCity">City</label>
              <input id="shippingCity" name="shippingCity" required className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="shippingPost">Postal code</label>
              <input id="shippingPost" name="shippingPost" required className="w-full rounded border px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="shippingCountry">Country code</label>
            <input id="shippingCountry" name="shippingCountry" defaultValue="GR" required className="w-full rounded border px-3 py-2" />
          </div>
        </div>

        {/* Payment method */}
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Payment method</legend>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="paymentMethod" value="online" defaultChecked />
            <span>Pay online (card)</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="paymentMethod" value="cash" />
            <span>Cash on delivery</span>
          </label>
        </fieldset>

        <button className="rounded bg-black text-white px-5 py-2.5">Continue</button>
      </form>
    </main>
  );
}
