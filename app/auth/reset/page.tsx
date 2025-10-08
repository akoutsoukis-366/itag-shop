import { resetPassword } from "@/app/auth/actions";

export default function ResetPage({ searchParams }: { searchParams?: { token?: string } }) {
  const token = searchParams?.token ?? "";
  async function action(formData: FormData) {
    "use server";
    const res = await resetPassword(formData);
    if (!res.ok) {
      return <div style={{ color: "#b91c1c", marginTop: 8 }}>{res.error}</div>;
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Reset password</h1>
      <form action={action} style={{ display: "grid", gap: 12 }}>
        <input type="hidden" name="token" value={token} />
        <label style={{ display: "grid", gap: 6 }}>
          <span>New password</span>
          <input name="password" type="password" required className="border px-2 py-1" />
        </label>
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">Reset</button>
      </form>
    </main>
  );
}
