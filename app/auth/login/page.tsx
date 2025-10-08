import Link from "next/link";
import LoginForm from "../LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp?.next ?? "";

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ marginBottom: 16 }}>Sign in</h1>
      <LoginForm next={next} />
      <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
        <Link href="/auth/register" className="underline">Create account</Link>
        <Link href="/auth/forgot" className="underline">Forgot password?</Link>
      </div>
    </main>
  );
}
