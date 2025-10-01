import { ToastProvider } from "@/app/components/ToastProvider";
import type { ReactNode } from "react";
import CartBadge from "@/components/CartBadge";

export const metadata = {
title: "i-tags Store",
description: "Apple Find My–compatible trackers",
};



export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <a href="/" className="text-lg font-semibold">Hyperloq</a>
            <nav className="flex items-center gap-4">
              <a href="/products" className="hover:underline">Products</a>
              {/* Always-available cart entry */}
              <CartBadge />
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}