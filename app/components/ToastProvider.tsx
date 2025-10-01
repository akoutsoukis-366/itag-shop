'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type Toast = { id: number; text: string; kind: 'success' | 'error' };
const ToastCtx = createContext<(t: Omit<Toast,'id'>) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
const [toasts, setToasts] = useState<Toast[]>([]);
function push(t: Omit<Toast,'id'>) {
const id = Date.now();
setToasts((xs) => [...xs, { id, ...t }]);
setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), 2200);
}
return (
<ToastCtx.Provider value={push}>
{children}
<div style={{ position: 'fixed', bottom: 16, right: 16, display: 'grid', gap: 8, zIndex: 50 }}>
{toasts.map((t) => (
<div key={t.id}
style={{ padding: '8px 12px', borderRadius: 6, color: 'white',
background: t.kind === 'success' ? '#16a34a' : '#dc2626',
boxShadow: '0 4px 14px rgba(0,0,0,.2)' }}>
{t.text}
</div>
))}
</div>
</ToastCtx.Provider>
);
}
export function useToast() { return useContext(ToastCtx); }

