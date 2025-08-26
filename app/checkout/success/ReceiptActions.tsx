'use client'

import { useEffect, useState } from "react";

export default function ReceiptActions({ sessionId }: { sessionId: string }) {
const [loading, setLoading] = useState(true);
const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
const [email, setEmail] = useState<string>("");

useEffect(() => {
let alive = true;
(async () => {
try {
const res = await fetch(`/checkout/success/receipt?session_id=${encodeURIComponent(sessionId)}`, {
cache: "no-store",
});
const data = await res.json();
if (!alive) return;
setReceiptUrl(data?.receiptUrl ?? null);
setEmail(data?.customerEmail ?? "");
} finally {
if (alive) setLoading(false);
}
})();
return () => {
alive = false;
};
}, [sessionId]);

async function resend() {
const target = prompt("Enter email to send receipt to:", email || "");
if (!target) return;
const res = await fetch(
`/checkout/success/receipt?session_id=${encodeURIComponent(sessionId)}&email=${encodeURIComponent(target)}`,
{ cache: "no-store" }
);
const data = await res.json();
if (data?.resent) alert("Receipt email sent.");
else alert(data?.error || "Could not send receipt.");
}

if (loading) return null;

return (
<div className="mt-4 flex items-center gap-3">
{receiptUrl ? (
<a className="rounded bg-gray-800 px-3 py-1.5 text-white" href={receiptUrl} target="_blank" rel="noreferrer">
View receipt
</a>
) : null}
<button onClick={resend} className="rounded border px-3 py-1.5">
Email receipt
</button>
</div>
);
}
