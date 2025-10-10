// app/auth/register/page.tsx

import Link from "next/link";
import { registerUser } from "@/app/auth/actions";

const countryCodes = [
  { code: "GR", dial: "+30" },
  { code: "CY", dial: "+357" },
  { code: "DE", dial: "+49" },
  { code: "FR", dial: "+33" },
  { code: "IT", dial: "+39" },
  { code: "ES", dial: "+34" },
];

export default function RegisterPage() {
  async function action(formData: FormData) {
    "use server";
    await registerUser(formData);
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ marginBottom: 16 }}>Create account</h1>
      <form action={action} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input name="email" type="email" required className="border px-2 py-1" />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Name</span>
          <input name="name" type="text" className="border px-2 py-1" />
        </label>

        <div style={{ display: "grid", gap: 6 }}>
          <span>Phone</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select name="countryDial" defaultValue="+30" className="border px-2 py-1" style={{ width: 120 }}>
              {countryCodes.map((c) => (
                <option key={c.code} value={c.dial}>
                  {c.code} {c.dial}
                </option>
              ))}
            </select>
            <input
              name="phoneLocal"
              type="tel"
              inputMode="tel"
              placeholder="69XXXXXXXX"
              className="border px-2 py-1"
              style={{ flex: 1 }}
            />
          </div>
          <small style={{ color: "#6b7280" }}>
            Include mobile number. Country code will be prefixed automatically.
          </small>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input name="password" type="password" required className="border px-2 py-1" />
        </label>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">Sign up</button>
          <Link href="/auth/login" className="underline">Have an account? Sign in</Link>
        </div>
      </form>
    </main>
  );
}
