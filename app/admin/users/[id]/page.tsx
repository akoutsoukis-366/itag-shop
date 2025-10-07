import Link from "next/link";
import { prisma } from "@/lib/db";
import { updateUser, deleteUser } from "@/app/admin/users/actions";

type Props = { params: Promise<{ id: string }> };

export default async function EditUserPage({ params }: Props) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  if (!user) return <main style={{ padding: 24 }}>User not found</main>;

  async function onUpdate(formData: FormData) {
    "use server";
    await updateUser(formData);
  }

  async function onDelete() {
    "use server";
    await deleteUser(user.id);
  }

  return (
    <main style={{ padding: 24 }}>
      <nav style={{ marginBottom: 12 }}>
        <Link href="/admin/users">← Back to users</Link>
      </nav>

      <h1 style={{ marginBottom: 16 }}>Edit user</h1>

      <form action={onUpdate} style={{ display: "grid", gap: 12, maxWidth: 560 }}>
        <input type="hidden" name="id" value={user.id} />
        <div>Email: <strong>{user.email}</strong></div>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Name</span>
          <input name="name" type="text" defaultValue={user.name ?? ""} className="border px-2 py-1" />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>New password (leave blank to keep)</span>
          <input name="password" type="password" className="border px-2 py-1" />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Role</span>
          <select name="role" defaultValue={user.role} className="border px-2 py-1">
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Active</span>
          <select name="isActive" defaultValue={user.isActive ? "true" : "false"} className="border px-2 py-1">
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">Save</button>
          <form action={onDelete}>
            <button type="submit" className="rounded bg-red-600 px-4 py-2 text-white">Delete</button>
          </form>
          <Link href="/admin/users">Cancel</Link>
        </div>
      </form>

      <section style={{ marginTop: 24 }}>
        <div>Created: {user.createdAt.toISOString()}</div>
      </section>
    </main>
  );
}
