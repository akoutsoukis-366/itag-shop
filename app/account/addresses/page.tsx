import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAddress, updateAddress, deleteAddress } from "./actions";
import { logoutUser } from "@/app/auth/actions";

export default async function AddressesPage() {
  const u = await requireUser();
  if (!u) return null;

  const addresses = await prisma.address.findMany({
    where: { userId: u.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  async function onCreate(formData: FormData) {
    "use server";
    await createAddress(formData);
  }

  async function onUpdate(formData: FormData) {
    "use server";
    await updateAddress(formData);
  }

  async function onDelete(id: string) {
    "use server";
    await deleteAddress(id);
  }

  async function onLogout() {
    "use server";
    await logoutUser();
  }

  return (
    <main style={{ padding: 24, maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <nav><Link href="/account">← Back to account</Link></nav>
        <form action={onLogout}><button type="submit" className="underline">Sign out</button></form>
      </div>

      <h1 style={{ marginBottom: 16 }}>Addresses</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>Add new</h2>
        <form action={onCreate} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          <input name="label" placeholder="Label (Home)" />
          <input name="recipient" placeholder="Recipient" required />
          <input name="phone" placeholder="Phone" />
          <input name="line1" placeholder="Address line 1" required />
          <input name="line2" placeholder="Address line 2" />
          <input name="city" placeholder="City" required />
          <input name="postal" placeholder="Postal code" required />
          <input name="country" placeholder="Country" defaultValue="GR" required />
          <label style={{ gridColumn: "1 / -1" }}>
            <input type="checkbox" name="isDefault" /> Make default
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="rounded bg-black px-4 py-2 text-white">Save</button>
          </div>
        </form>
      </section>

      <section>
        <h2>Saved</h2>
        {addresses.length === 0 ? <div>No addresses.</div> : null}
        <ul style={{ display: "grid", gap: 12 }}>
          {addresses.map(a => (
            <li key={a.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
              <form action={onUpdate} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
                <input type="hidden" name="id" value={a.id} />
                <input name="label" defaultValue={a.label} />
                <input name="recipient" defaultValue={a.recipient} />
                <input name="phone" defaultValue={a.phone ?? ""} />
                <input name="line1" defaultValue={a.line1} />
                <input name="line2" defaultValue={a.line2 ?? ""} />
                <input name="city" defaultValue={a.city} />
                <input name="postal" defaultValue={a.postal} />
                <input name="country" defaultValue={a.country} />
                <label style={{ gridColumn: "1 / -1" }}>
                  <input type="checkbox" name="isDefault" defaultChecked={a.isDefault} /> Default
                </label>
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
                  <button className="rounded bg-black px-4 py-2 text-white">Update</button>
                  {/* Delete button uses formAction inside the same form; no nested form */}
                  <button
                    type="submit"
                    className="underline"
                    formAction={async () => {
                      "use server";
                      await onDelete(a.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
