"use server";

import { logInfo, logWarn, logError } from "../../lib/log";

// Calls the internal API route with optional amountCents (partial refund support).
// Requires APP_URL in .env to be set to the site/base URL, e.g., http://localhost:3000
export async function refundOrder(orderId: string, amountCents?: number) {
const base = process.env.APP_URL;
if (!base) {
throw new Error("APP_URL not configured");
}

try {
const url = ${base}/api/orders/${orderId}/refund;
const headers: Record<string, string> = {
"content-type": "application/json",
"cache-control": "no-store",
};
if (process.env.INTERNAL_ADMIN_KEY) {
headers["x-internal-key"] = process.env.INTERNAL_ADMIN_KEY;
}
const resp = await fetch(url, {
  method: "POST",
  headers,
  body: amountCents ? JSON.stringify({ amountCents }) : "{}",
});

if (!resp.ok) {
  const text = await resp.text().catch(() => "");
  logWarn("Admin refund call failed", {
    orderId,
    status: resp.status,
    body: text,
  });
  throw new Error(text || "Refund failed");
}

const data = (await resp.json()) as { ok: boolean; refundId: string; amountCents: number };
logInfo("Admin refund call ok", { orderId, ...data });
return data;
} catch (e: any) {
logError("Admin refund call error", { orderId, error: String(e) });
throw e;
}
}