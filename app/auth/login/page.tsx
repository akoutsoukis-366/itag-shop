import Link from "next/link";
import { loginUser } from "@/app/auth/actions";

export default function LoginPage() {
  async function action(formData: FormData) {
    "use server";
    await loginUser(formData);
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ marginBottom: 16 }}>Sign in</h1>
      <form action={action} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input name="email" type="email" required className="border px-2 py-1" />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input name="password" type="password" required className="border px-2 py-1" />
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">Sign in</button>
          <Link href="/auth/register" className="underline">Create account</Link>
        </div>
      </form>
    </main>
  );
}
