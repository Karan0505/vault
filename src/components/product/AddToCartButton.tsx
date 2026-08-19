"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { notifyCartUpdated } from "@/lib/cart-events";
import { useCartDrawer } from "@/components/cart/CartDrawerContext";

interface AddToCartButtonProps {
  variantId: string | null;
  disabled?: boolean;
}

export function AddToCartButton({ variantId, disabled }: AddToCartButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const { open } = useCartDrawer();

  async function handleClick() {
    if (!variantId) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity: 1 }),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }

      notifyCartUpdated();
      setStatus("done");
      open();
      setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("error");
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      onClick={handleClick}
      disabled={!variantId || disabled || status === "loading"}
      className="w-full"
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === "done" ? (
          <motion.span
            key="done"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <Check size={16} /> Added
          </motion.span>
        ) : (
          <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {status === "loading" ? "Adding…" : status === "error" ? "Couldn't add — try again" : "Add to cart"}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
