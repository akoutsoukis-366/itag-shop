import { requireUser } from "@/lib/auth";
import { updateProfile, changePassword } from "@/app/account/actions";
import Link from "next/link";

export default async function ProfilePage() {
  const u = await requireUser();
  if (!u) return null;

  async function onProfile(formData: FormData) {
    "use server";
    await updateProfile(formData);
  }
  async function onPassword(formData: FormData) {
    "use server";
    await changePassword(formData);
  }

  return (
    <main>
      <nav style={{ marginBottom: 12 }}>
        <Link href="/account">← Back to account</Link>
      </nav>

      <h1 style={{ marginBottom: 16 }}>Profile</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>Details</h2>
        <form action={onProfile} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Name</span>
            <input name="name" type="text" defaultValue={u.name ?? ""} className="border px-2 py-1" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Email</span>
            <input name="email" type="email" defaultValue={u.email} className="border px-2 py-1" />
          </label>
          <button className="rounded bg-black px-4 py-2 text-white" type="submit">Save</button>
        </form>
      </section>

      <section>
        <h2>Password</h2>
        <form action={onPassword} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Current password</span>
            <input name="current" type="password" className="border px-2 py-1" required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>New password</span>
            <input name="next" type="password" className="border px-2 py-1" required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Confirm new password</span>
            <input name="confirm" type="password" className="border px-2 py-1" required />
          </label>
          <button className="rounded bg-black px-4 py-2 text-white" type="submit">Change password</button>
        </form>
      </section>
    </main>
  );
}
