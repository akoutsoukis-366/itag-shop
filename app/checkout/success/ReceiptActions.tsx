'use client';

import { useEffect, useState } from 'react';

export default function ReceiptActions({ sessionId }: { sessionId: string }) {
const [loading, setLoading] = useState(true);
const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
const [email, setEmail] = useState<string>('');
const [error, setError] = useState<string | null>(null);

useEffect(() => {
let alive = true;
(async () => {
try {
const res = await fetch(
`/checkout/success/receipt?session_id=${encodeURIComponent(sessionId)}`,
{ cache: 'no-store' }
);
const data = await res.json();
if (!alive) return;
if (data?.error) {
setError(String(data.error));
} else {
setReceiptUrl(data?.receiptUrl ?? null);
setEmail(data?.customerEmail ?? '');
}
} catch (e: any) {
if (alive) setError(e?.message ?? 'Failed to load receipt');
} finally {
if (alive) setLoading(false);
}
})();
return () => {
alive = false;
};
}, [sessionId]);

async function resend() {
const target = prompt('Enter email to send receipt to:', email || '');
if (!target) return;
const res = await fetch(
`/checkout/success/receipt?session_id=${encodeURIComponent(sessionId)}&email=${encodeURIComponent( target )}`,
{ cache: 'no-store' }
);
const data = await res.json();
if (data?.resent) alert('Receipt email sent.');
else alert(data?.error || 'Could not send receipt.');
}

if (loading) return null;
if (error) return null;

return (
<div className="mt-4 flex flex-wrap items-center gap-3">
{receiptUrl ? (
<a className="rounded bg-gray-800 px-3 py-1.5 text-white" href={receiptUrl} target="_blank" rel="noreferrer" >
View receipt
</a>
) : (
<span className="text-sm text-gray-500">Receipt not available yet</span>
)}
<button onClick={resend} className="rounded border px-3 py-1.5 text-sm">
Email receipt
</button>
</div>
);
}