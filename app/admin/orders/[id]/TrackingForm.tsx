'use client';
import { useState } from "react";
import { useToast } from "@/app/components/ToastProvider";

export function TrackingForm({ orderId, currentCarrier, currentNumber, currentUrl }: {
orderId: string; currentCarrier?: string|null; currentNumber?: string|null; currentUrl?: string|null;
}) {
const [carrier, setCarrier] = useState(currentCarrier ?? "");
const [num, setNum] = useState(currentNumber ?? "");
const [url, setUrl] = useState(currentUrl ?? "");
const [sendEmail, setSendEmail] = useState(true);
const [saving, setSaving] = useState(false);
const toast = useToast();

function validUrl(u: string) {
// empty is allowed, else must start with https://
return u === "" || /^https:\/\/.+/i.test(u);
}

async function save() {
const payload = { carrier: carrier.trim(), trackingNumber: num.trim(), trackingUrl: url.trim(), sendEmail };
if (!validUrl(payload.trackingUrl)) { toast({ text: "Tracking URL must start with https://", kind: "error" }); return; }
try {
setSaving(true);
const res = await fetch(`/admin/orders/${orderId}/tracking`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload),
});
if (!res.ok) throw new Error(String(res.status));
const json = await res.json().catch(() => ({}));
toast({ text: json.emailed ? "Tracking saved and email sent" : "Tracking saved", kind: "success" });
window.location.reload();
} catch (e) {
toast({ text: "Save failed", kind: "error" });
} finally {
setSaving(false);
}
}

return (
<div>
<input value={carrier} onChange={(e)=>setCarrier(e.target.value)} placeholder="Carrier" />
<input value={num} onChange={(e)=>setNum(e.target.value)} placeholder="Tracking number" />
<input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="Tracking URL (https://…)" />
<label>
<input type="checkbox" checked={sendEmail} onChange={(e)=>setSendEmail(e.target.checked)} />
Send email to customer
</label>
<button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save tracking"}</button>
</div>
);
}