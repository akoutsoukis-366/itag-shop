"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { loginUser } from "@/app/auth/actions";

type State = { ok: boolean; error?: string } | null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded bg-black px-4 py-2 text-white">
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export default function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = React.useActionState<State, FormData>(
    async (_prev: State, formData: FormData) => {
      const res = await loginUser(formData);
      // On success, loginUser redirects; on error, return state to render message
      return res ?? { ok: true };
    },
    null
  );

  // Preserve entered email after an error for convenience
  const [email, setEmail] = React.useState("");

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="next" value={next || ""} />

      <label style={{ display: "grid", gap: 6 }}>
        <span>Email</span>
        <input
          name="email"
          type="email"
          required
          className="border px-2 py-1"
          defaultValue={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Password</span>
        <input name="password" type="password" required className="border px-2 py-1" />
      </label>

      {state?.error ? (
        <div role="alert" style={{ color: "#b91c1c" }}>
          {state.error}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
