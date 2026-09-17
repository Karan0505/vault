"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { CART_UPDATED_EVENT } from "@/lib/cart/cart-events";
import { useCartDrawer } from "./CartDrawerContext";

interface CartApiLine {
  quantity: number;
}

export function CartCountBadge() {
  const [count, setCount] = useState<number | null>(null);
  const { open } = useCartDrawer();

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/cart", { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json();
        const lines: CartApiLine[] = body.cart?.lines ?? [];
        const total = lines.reduce((sum, line) => sum + line.quantity, 0);
        if (!cancelled) setCount(total);
      } catch {
        // Storefront chrome degrades gracefully
      }
    }

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(() => refresh());
    } else {
      setTimeout(refresh, 100);
    }
    window.addEventListener(CART_UPDATED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(CART_UPDATED_EVENT, refresh);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Open cart${count ? `, ${count} items` : ""}`}
      className="relative flex items-center justify-center p-2 text-gray-700 dark:text-gray-300 transition-colors hover:text-black dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-ink-800"
    >
      <ShoppingBag size={20} strokeWidth={1.8} />
      {Boolean(count && count > 0) && (
        <span
          key={count}
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 font-sans text-[10px] font-bold text-white shadow-sm transition-transform duration-200"
        >
          {count}
        </span>
      )}
    </button>
  );
}
