"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CART_UPDATED_EVENT } from "@/lib/cart-events";
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

    refresh();
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
      className="relative flex items-center justify-center p-2 text-gray-700 transition-colors hover:text-black rounded-full hover:bg-gray-100"
    >
      <ShoppingBag size={20} strokeWidth={1.8} />
      <AnimatePresence>
        {Boolean(count && count > 0) && (
          <motion.span
            key={count}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 font-sans text-[10px] font-bold text-white shadow-sm"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
