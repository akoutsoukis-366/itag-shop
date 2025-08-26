export const dynamic = "force-dynamic"; // fresh order data on redirect

import Link from "next/link";
import { loadOrderForSuccess } from "./actions"; // server loader by session id

import AutoClear from "./AutoClear"; // client: clears cart cookie via route
import ReceiptActions from "./ReceiptActions"; // client: receipt link/email

type SP = { session_id?: string };

export default async function SuccessPage({
searchParams,
}: {
searchParams: Promise<SP>;
}) {
const { session_id } = await searchParams; // from success_url

const order = session_id ? await loadOrderForSuccess(session_id) : null; // DB load
const pending = !!session_id && !order; // small webhook window

return (
<div className="mx-auto max-w-3xl p-8">
<h1 className="mb-2 text-3xl font-bold">Payment received</h1>
<p className="text-gray-600">
{pending
? "Finalizing your order. This may take a few seconds..."
: "Thanks! Your order has been recorded. A confirmation email will follow."}
</p>
  {/* Auto-clear cart cookie once order exists */}
  {order && session_id ? <AutoClear sessionId={session_id} /> : null} {/* cookie mutation via Route Handler  */}[5][6]

  {order ? (
    <div className="mt-6 rounded border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Order ID</div>
          <div className="font-mono text-sm">{order.id}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-xl font-semibold">€{(order.totalCents / 100).toFixed(2)}</div>
        </div>
      </div>

      <div className="mt-2">
        <div className="text-sm font-semibold">Items</div>
        <ul className="mt-2 list-disc pl-5">
          {order.lineItems.map((li: any) => (
            <li key={li.id} className="text-sm">
              {li.title} × {li.quantity} — €{(li.unitCents / 100).toFixed(2)}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <div>
          <div className="text-sm font-semibold">Delivery</div>
          <div className="text-sm text-gray-700">
            {order.shippingName}
            {order.shippingPhone ? `, ${order.shippingPhone}` : ""}
          </div>
          <div className="text-sm text-gray-700">
            {order.shippingAddr1}
            {order.shippingAddr2 ? `, ${order.shippingAddr2}` : ""}
          </div>
          <div className="text-sm text-gray-700">
            {order.shippingCity}, {order.shippingPost}, {order.shippingCountry}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500">Subtotal €{(order.subtotalCents / 100).toFixed(2)}</div>
          <div className="text-sm text-gray-500">Tax €{(order.taxCents / 100).toFixed(2)}</div>
          <div className="text-sm text-gray-500">Shipping €{(order.shippingCents / 100).toFixed(2)}</div>
          <div className="text-base font-semibold">Total €{(order.totalCents / 100).toFixed(2)}</div>
        </div>
      </div>

      {/* Receipt actions */}
      {session_id ? <ReceiptActions sessionId={session_id} /> : null} {/* view/email receipt via Stripe  */}[3]
    </div>
  ) : null}

  <div className="mt-8">
    <Link href="/" className="rounded bg-black px-4 py-2 text-white">
      Continue shopping
    </Link>
  </div>
</div>
);
}