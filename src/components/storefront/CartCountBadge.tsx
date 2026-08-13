"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CART_UPDATED_EVENT } from "@/lib/cart-events";
import { useCartDrawer } from "@/components/cart/CartDrawerContext";

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
        // Storefront chrome degrading silently is preferable to a thrown
        // error over a badge — the cart page itself will surface real errors.
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
      className="relative flex items-center gap-1.5 text-ink-300 transition-colors hover:text-ink-50"
    >
      <ShoppingBag size={18} strokeWidth={1.75} />
      <AnimatePresence>
        {Boolean(count) && (
          <motion.span
            key={count}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brass-400 px-1 font-mono text-[10px] font-semibold text-ink-950"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
