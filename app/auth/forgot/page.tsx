import { requestPasswordReset } from "@/app/auth/actions";

export default function ForgotPage() {
  async function action(formData: FormData) {
    "use server";
    await requestPasswordReset(formData);
  }
  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Forgot password</h1>
      <form action={action} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input name="email" type="email" required className="border px-2 py-1" />
        </label>
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">Send reset link</button>
      </form>
      <p style={{ marginTop: 12 }}>If the email exists, a reset link will be sent.</p>
    </main>
  );
}
