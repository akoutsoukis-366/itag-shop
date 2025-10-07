import Link from "next/link";
import { createUser } from "@/app/admin/users/actions";

export default function NewUserPage() {
  async function action(formData: FormData) {
    "use server";
    await createUser(formData);
  }

  return (
    <main style={{ padding: 24 }}>
      <nav style={{ marginBottom: 12 }}>
        <Link href="/admin/users">← Back to users</Link>
      </nav>

      <h1 style={{ marginBottom: 16 }}>Create user</h1>

      <form action={action} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input name="email" type="email" required className="border px-2 py-1" />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Name</span>
          <input name="name" type="text" className="border px-2 py-1" />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input name="password" type="password" required className="border px-2 py-1" />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Role</span>
          <select name="role" defaultValue="USER" className="border px-2 py-1">
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">Create</button>
          <Link href="/admin/users">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
