'use client'; // Mark as Client Component for interactivity

import { useState } from "react"; // Client state for form fields

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
const [url, setUrl] = useState(currentUrl ?? ""); // Initialize inputs from server data

async function save() {
await fetch(`/admin/orders/${orderId}/tracking, {
method: "POST",
body: JSON.stringify({ carrier, trackingNumber: num, trackingUrl: url }),
headers: { "Content-Type": "application/json" },
}`); // Use template literal and JSON header for POST body

window.location.reload(); // Simple refresh to reflect changes


}

return (
<div className="rounded border p-4">
<div className="mb-2 text-sm font-semibold">Tracking</div>
<div className="flex flex-col gap-2">
<input
className="border p-2 text-sm"
placeholder="Carrier"
value={carrier}
onChange={(e) => setCarrier(e.target.value)}
/>
<input
className="border p-2 text-sm"
placeholder="Tracking number"
value={num}
onChange={(e) => setNum(e.target.value)}
/>
<input
className="border p-2 text-sm"
placeholder="Tracking URL"
value={url}
onChange={(e) => setUrl(e.target.value)}
/>
<button className="rounded bg-black px-3 py-1.5 text-white" onClick={save}>
Save tracking
</button>
</div>
</div>
); // Client form to update tracking details

} // Named export; in page.tsx import as: import { TrackingForm } from "./TrackingForm";