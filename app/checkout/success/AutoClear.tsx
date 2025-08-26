"use client";

import { useEffect } from "react";

export default function AutoClear({ sessionId }: { sessionId: string }) {
useEffect(() => {
if (!sessionId) return;
fetch(`/checkout/success/clear?session_id=${encodeURIComponent(sessionId)}`, {
cache: "no-store",
redirect: "follow",
}).catch(() => {});
}, [sessionId]);

return null;
}