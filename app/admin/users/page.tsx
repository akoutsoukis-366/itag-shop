import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function UsersListPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  return (
    <main style={{ padding: 24 }}>
      <h1>Users</h1>
      <div style={{ margin: "12px 0" }}>
        <Link href="/admin/users/new">New user</Link>
      </div>
      <table>
        <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Active</th><th/></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.name ?? "-"}</td>
              <td>{u.role}</td>
              <td>{u.isActive ? "Yes" : "No"}</td>
              <td><Link href={`/admin/users/${u.id}`}>Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
