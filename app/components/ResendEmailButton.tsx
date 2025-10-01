// app/components/ResendEmailButton.tsx
"use client";
import { useState } from "react";

export function ResendEmailButton({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  const onClick = async () => {
    if (status === "sending") return;
    setStatus("sending");
    setMsg("");
    try {
      const res = await fetch(`/api/orders/${orderId}/resend-confirmation`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("sent");
        setMsg(data?.message ?? "Email sent");
      } else {
        setStatus("error");
        setMsg(data?.error ?? "Send failed");
      }
    } catch {
      setStatus("error");
      setMsg("Send failed");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={status === "sending"}
        className="rounded border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
      >
        {status === "sending" ? "Sending..." : "Resend email"}
      </button>
      {msg ? <span className="text-sm text-gray-600">{msg}</span> : null}
    </div>
  );
}
