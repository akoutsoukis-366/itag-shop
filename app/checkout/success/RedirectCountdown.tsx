'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
to?: string;
seconds?: number;
};

export default function RedirectCountdown({ to = '/', seconds = 10 }: Props) {
const [timeLeft, setTimeLeft] = useState(Math.max(1, seconds));
const cancelledRef = useRef(false);
const timerRef = useRef<number | null>(null);

useEffect(() => {
const cancel = () => {
cancelledRef.current = true;
if (timerRef.current) window.clearInterval(timerRef.current);
};
document.addEventListener('click', cancel, { capture: true });
document.addEventListener('keydown', cancel, { capture: true });
return () => {
document.removeEventListener('click', cancel as any, { capture: true } as any);
document.removeEventListener('keydown', cancel as any, { capture: true } as any);
};
}, []);

useEffect(() => {
timerRef.current = window.setInterval(() => {
setTimeLeft((t) => {
if (t <= 1) {
if (!cancelledRef.current) {
Promise.resolve().then(() => window.location.replace(to));
}
if (timerRef.current) window.clearInterval(timerRef.current);
return 0;
}
return t - 1;
});
}, 1000) as unknown as number;
return () => {
  if (timerRef.current) window.clearInterval(timerRef.current);
};
}, [to]);

if (cancelledRef.current) return null;

return (
<p className="mt-4 text-sm text-gray-600">
Redirecting in <span className="font-medium">{timeLeft}</span> seconds…
</p>
);
}
