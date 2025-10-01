'use client';
import { useState } from "react";
import { useToast } from "@/app/components/ToastProvider";
const OPTIONS = ["PENDING","PACKING","SHIPPED","DELIVERED"] as const;
export function StatusForm({ orderId, current }:{orderId:string; current:string|null}) {
const [value, setValue] = useState(current ?? "PENDING");
const [saving, setSaving] = useState(false);
const toast = useToast();
async function save() {
try {
setSaving(true);
const res = await fetch(`/admin/orders/${orderId}/status`, {
method: "POST", headers: { "Content-Type": "application/json" },
body: JSON.stringify({ status: value.trim().toUpperCase() })
});
if (!res.ok) throw new Error(String(res.status));
toast({ text: "Status updated", kind: "success" });
window.location.reload();
} catch {
toast({ text: "Update failed", kind: "error" });
} finally {
setSaving(false);
}
}
return (
<div className="rounded border p-4">
<div className="mb-2 text-sm font-semibold">Status</div>
<div className="flex items-center gap-2">
<select className="border p-2 text-sm" value={value} onChange={(e)=>setValue(e.target.value)}>
{OPTIONS.map((opt)=> (<option key={opt} value={opt}>{opt}</option>))}
</select>
<button className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50" disabled={saving} onClick={save}>{saving?"Saving…":"Update"}</button>
</div>
</div>
);
}
