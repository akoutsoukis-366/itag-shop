// app/checkout/success/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ResendEmailButton } from "@/app/components/ResendEmailButton";

interface OrderData {
  id: string;
  total: number; // cents
  items: Array<{ name: string; price: number; quantity: number }>;
  shipping: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  customerEmail: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  _verified: boolean;
  _paymentStatus: string;
}

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = useMemo(() => searchParams.get("session_id") || "", [searchParams]);

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(10);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const navigatedRef = useRef(false);
  const codMailSentRef = useRef(false); // ensure single fire for COD

  useEffect(() => {
    if (!sessionId) {
      router.push("/");
      return;
    }

    let cancelled = false;

    const fetchOrderData = async () => {
      try {
        setErrorMsg(null);
        const url = `/checkout/success/receipt?session_id=${encodeURIComponent(sessionId)}`;
        const res = await fetch(url, { method: "GET", cache: "no-store" });
        if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
        const raw = await res.json();

        if (!raw.verified) {
          if (!cancelled) {
            setOrderData({
              id: "",
              total: 0,
              items: [],
              shipping: { name: "", address: "", city: "", postalCode: "", country: "" },
              customerEmail: "",
              _verified: false,
              _paymentStatus: "UNKNOWN",
            });
          }
          return;
        }

        const o = raw.order ?? {};
        const norm: OrderData = {
          id: o.id ?? "",
          total: typeof o.totalCents === "number" ? o.totalCents : 0,
          items: Array.isArray(o.orderItems)
            ? o.orderItems.map((it: any) => ({
                name: it.title ?? "Item",
                price: typeof it.unitCents === "number" ? it.unitCents : 0,
                quantity: Number(it.quantity ?? 1),
              }))
            : [],
          shipping: {
            name: o.shippingName ?? "",
            address: o.shippingAddr1 ?? "",
            city: o.shippingCity ?? "",
            postalCode: o.shippingPost ?? "",
            country: o.shippingCountry ?? "GR",
          },
          customerEmail: o.email ?? "",
          _verified: Boolean(raw.verified),
          _paymentStatus: o.paymentStatus ?? "UNKNOWN",
        };

        if (!cancelled) setOrderData(norm);
      } catch (err: any) {
        if (!cancelled) setErrorMsg("Could not load order details. If payment succeeded, support will receive the order.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOrderData();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  useEffect(() => {
    if (loading || !orderData || !orderData._verified) return; // do not redirect on failure
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCountdown((p) => Math.max(0, p - 1)), 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, orderData]);

  useEffect(() => {
    if (loading) return;
    if (!orderData?._verified) return;
    if (countdown === 0 && !navigatedRef.current) {
      navigatedRef.current = true;
      setIsRedirecting(true);
      router.push("/products");
    }
  }, [countdown, loading, router, orderData]);

  // Auto-send confirmation for COD orders (unpaid, verified) once, via existing resend route
  useEffect(() => {
    const isCashSession = sessionId.startsWith("cash-");
    if (!isCashSession) return;
    if (loading) return;
    if (!orderData?._verified) return;
    if (orderData._paymentStatus === "PAID") return;
    if (!orderData.id) return;
    if (codMailSentRef.current) return;

    codMailSentRef.current = true;
    (async () => {
      try {
        await fetch(`/api/orders/${encodeURIComponent(orderData.id)}/resend-confirmation`, {
          method: "POST",
        });
      } catch {
        // ignore UI error; user can press Resend
      }
    })();
  }, [sessionId, loading, orderData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Finalizing order</h1>
          <p className="mb-4">This may take a few seconds...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">We’re checking your order</h1>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <Link href="/products" className="text-blue-600 hover:underline">Continue shopping</Link>
        </div>
      </div>
    );
  }

  if (!orderData || !orderData._verified) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5a7 7 0 100 14 7 7 0 000-14z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Unable to complete payment</h1>
          <p className="text-gray-600 mb-6">The Stripe payment did not complete. No charge was made.</p>
          <div className="flex justify-center gap-3">
            <Link href="/cart" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">Try again</Link>
            <Link href="/products" className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50">Continue shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  const items = Array.isArray(orderData.items) ? orderData.items : [];
  const isPaid = orderData._paymentStatus === "PAID";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            {isPaid ? (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment received</h1>
                <p className="text-gray-600">Thanks! Your order has been recorded.</p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Order received</h1>
                <p className="text-gray-600">Payment on delivery. A confirmation email will follow.</p>
              </>
            )}
          </div>

          <div className="border-t border-gray-200 pt-8">
            <div className="grid grid-cols-1 md-grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg font-semibold mb-4">Order Details</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID</span>
                    <span className="font-mono">{orderData.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total</span>
                    <span className="font-semibold">€{(Number(orderData.total ?? 0) / 100).toFixed(2)}</span>
                  </div>
                </div>

                <h3 className="text-md font-semibold mt-6 mb-3">Items</h3>
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <div className="text-sm text-gray-500">No items found.</div>
                  ) : (
                    items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{(item.name ?? "Item")} × {Number(item.quantity ?? 0)}</span>
                        <span>€{(((item.price ?? 0) * Number(item.quantity ?? 0)) / 100).toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Delivery</h2>
                <div className="text-sm space-y-1">
                  <div>{orderData.shipping.name}</div>
                  <div>{orderData.shipping.address}</div>
                  <div>{orderData.shipping.city}, {orderData.shipping.postalCode}</div>
                  <div>{orderData.shipping.country}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 mt-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/products" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center">
                Continue shopping
              </Link>
              <Link href={`/orders/${orderData.id}`} className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors text-center">
                View order details
              </Link>
              <ResendEmailButton orderId={orderData.id} />
            </div>
          </div>

          {isPaid && !isRedirecting && (
            <div className="text-center mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Redirecting to products page in {countdown} seconds...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
