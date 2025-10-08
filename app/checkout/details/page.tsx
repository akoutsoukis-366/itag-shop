import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { startCheckout } from "@/app/checkout/details/actions";
import Link from "next/link";

export default async function CheckoutDetailsPage() {
  const u = await requireUser();

  // Prefill from default address if signed in
  let def:
    | {
        recipient: string;
        phone: string | null;
        line1: string;
        line2: string | null;
        city: string;
        postal: string;
        country: string;
      }
    | null = null;

  if (u) {
    const row = await prisma.address.findFirst({
      where: { userId: u.id, isDefault: true },
      select: { recipient: true, phone: true, line1: true, line2: true, city: true, postal: true, country: true },
    });
    if (row) def = row;
  }

  async function action(formData: FormData) {
    "use server";
    await startCheckout(formData);
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <nav style={{ marginBottom: 12 }}>
        <Link href="/cart">← Back to cart</Link>
      </nav>

      <h1 style={{ marginBottom: 16 }}>Checkout details</h1>

      <form action={action} style={{ display: "grid", gap: 12 }}>
        <fieldset style={{ border: "1px solid #eee", borderRadius: 6, padding: 12 }}>
          <legend>Contact</legend>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Email</span>
            <input
              name="email"
              type="email"
              required
              className="border px-2 py-1"
              defaultValue={u?.email ?? ""}
              placeholder="name@example.com"
            />
          </label>
        </fieldset>

        <fieldset style={{ border: "1px solid #eee", borderRadius: 6, padding: 12 }}>
          <legend>Shipping address</legend>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Name</span>
              <input
                name="shippingName"
                required
                className="border px-2 py-1"
                defaultValue={def?.recipient ?? u?.name ?? ""}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Phone</span>
              <input
                name="shippingPhone"
                className="border px-2 py-1"
                defaultValue={def?.phone ?? ""}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Address line 1</span>
              <input
                name="shippingAddr1"
                required
                className="border px-2 py-1"
                defaultValue={def?.line1 ?? ""}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Address line 2</span>
              <input
                name="shippingAddr2"
                className="border px-2 py-1"
                defaultValue={def?.line2 ?? ""}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>City</span>
              <input
                name="shippingCity"
                required
                className="border px-2 py-1"
                defaultValue={def?.city ?? ""}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Postal code</span>
              <input
                name="shippingPost"
                required
                className="border px-2 py-1"
                defaultValue={def?.postal ?? ""}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Country</span>
              <input
                name="shippingCountry"
                required
                className="border px-2 py-1"
                defaultValue={def?.country ?? "GR"}
              />
            </label>
          </div>
        </fieldset>

        <fieldset style={{ border: "1px solid #eee", borderRadius: 6, padding: 12 }}>
          <legend>Payment</legend>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="radio" name="paymentMethod" value="online" defaultChecked />
              <span>Card (Stripe)</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="radio" name="paymentMethod" value="cash" />
              <span>Cash on delivery</span>
            </label>
          </div>
        </fieldset>

        <div style={{ display: "flex", gap: 12 }}>
          <button className="rounded bg-black px-4 py-2 text-white" type="submit">
            Continue to payment
          </button>
          <Link href="/cart" className="underline">Cancel</Link>
        </div>
      </form>

      {u ? (
        <div style={{ marginTop: 16 }}>
          Prefilled from default address. Manage addresses in{" "}
          <Link href="/account/addresses" className="underline">Account → Addresses</Link>.
        </div>
      ) : null}
    </main>
  );
}
