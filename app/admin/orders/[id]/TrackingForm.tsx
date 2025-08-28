'use client';
import { useState } from "react";

export function TrackingForm({
orderId,
currentCarrier,
currentNumber,
currentUrl,
}: {
orderId: string;
currentCarrier?: string | null;
currentNumber?: string | null;
currentUrl?: string | null;
}) {
const [carrier, setCarrier] = useState(currentCarrier ?? "");
const [num, setNum] = useState(currentNumber ?? "");
const [url, setUrl] = useState(currentUrl ?? "");
const [saving, setSaving] = useState(false);

async function save() {
setSaving(true);
const payload = {
carrier: carrier.trim(),
trackingNumber: num.trim(),
trackingUrl: url.trim(),
};
await fetch(`/admin/orders/${orderId}/tracking`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload),
});
window.location.reload();
}

return (
<div className="rounded border p-4">
<div className="mb-2 text-sm font-semibold">Tracking</div>
<div className="flex flex-col gap-2">
<input className="border p-2 text-sm" placeholder="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
<input className="border p-2 text-sm" placeholder="Tracking number" value={num} onChange={(e) => setNum(e.target.value)} />
<input className="border p-2 text-sm" placeholder="Tracking URL" value={url} onChange={(e) => setUrl(e.target.value)} />
<button className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50" disabled={saving} onClick={save}>
{saving ? "Saving…" : "Save tracking"}
</button>
</div>
</div>
);
}

