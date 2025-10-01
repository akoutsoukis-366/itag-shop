"use client";

import { useState, useCallback, useEffect } from "react";

export function useToast(timeoutMs = 2000) {
  const [msg, setMsg] = useState<string | null>(null);

  const show = useCallback((m: string) => setMsg(m), []);
  const hide = useCallback(() => setMsg(null), []);

  // Auto-hide after timeout
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), timeoutMs);
    return () => clearTimeout(t);
  }, [msg, timeoutMs]);

  const Toast = () =>
    msg ? (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="rounded bg-black text-white px-4 py-2 shadow">{msg}</div>
      </div>
    ) : null;

  return { show, hide, Toast };
}