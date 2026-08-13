"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { motion, AnimatePresence } from "framer-motion";
import { CartLineItem } from "./CartLineItem";
import { DiscountCodeForm } from "./DiscountCodeForm";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import type { CartView } from "@/lib/cart.server";

interface AppliedDiscount {
  code: string;
  totalDiscount: number;
  freeShipping: boolean;
}

const FLAT_SHIPPING_AMOUNT = 599;

import { cn } from "@/lib/utils";

import { useCartDrawer } from "./CartDrawerContext";

interface CartPageBodyProps {
  isDrawer?: boolean;
}

export function CartPageBody({ isDrawer }: CartPageBodyProps) {
  const router = useRouter();
  const { close: closeCartDrawer } = useCartDrawer();
  const [cart, setCart] = useState<CartView | null>(null);
  const [discount, setDiscount] = useState<AppliedDiscount | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/cart", { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      setCart(body.cart);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!cart) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-20 rounded-xl" />
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="ledger-rule flex flex-col items-center gap-3 py-24 text-center">
        <p className="font-display text-xl text-ink-200">Your cart is empty</p>
        <Link href="/" className="text-sm text-brass-300 hover:text-brass-200">
          Continue browsing →
        </Link>
      </div>
    );
  }

  const shippingAmount = discount?.freeShipping ? 0 : FLAT_SHIPPING_AMOUNT;
  const discountAmount = discount?.totalDiscount ?? 0;
  const total = cart.subtotal - discountAmount + shippingAmount;
  const currency = cart.currency ?? "USD";
  const canCheckout = cart.lines.every((line) => line.isEnabled && line.quantity <= line.onHand) && cart.lines.length > 0;

  return (
    <div className={isDrawer ? "flex flex-col gap-6" : "grid gap-10 lg:grid-cols-[1fr_360px]"}>
      <div className="flex flex-col gap-4">
        {cart.lines.map((line) => (
          <CartLineItem key={line.itemId} line={line} onChanged={refresh} />
        ))}
      </div>

      <div className={cn(
        "flex flex-col gap-6 rounded-2xl border border-ink-700 bg-ink-900/50 p-6 shadow-panel",
        !isDrawer && "lg:sticky lg:top-24 lg:self-start"
      )}>
        <DiscountCodeForm
          onApplied={(code, preview) =>
            setDiscount({ code, totalDiscount: preview.totalDiscount ?? 0, freeShipping: Boolean(preview.freeShipping) })
          }
        />

        <div className="ledger-rule flex flex-col gap-2.5 pt-4 font-mono text-sm">
          <div className="flex justify-between text-ink-400">
            <span>Subtotal</span>
            <span>{formatMoney({ amount: cart.subtotal, currency })}</span>
          </div>
          <AnimatePresence>
            {discount && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-between text-signal-green"
              >
                <span>{discount.code}</span>
                <span>
                  {discount.freeShipping ? "Free shipping" : `−${formatMoney({ amount: discount.totalDiscount, currency })}`}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex justify-between text-ink-400">
            <span>Shipping</span>
            <span>{shippingAmount === 0 ? "Free" : formatMoney({ amount: shippingAmount, currency })}</span>
          </div>
          <div className="ledger-rule flex justify-between pt-2.5 text-base text-ink-50">
            <span>Total</span>
            <span>{formatMoney({ amount: total, currency })}</span>
          </div>
        </div>

        <Button
          size="lg"
          disabled={!canCheckout}
          onClick={() => {
            const checkoutUrl = discount ? `/checkout?discount=${encodeURIComponent(discount.code)}` : "/checkout";
            router.push(checkoutUrl as Route);
          }}
        >
          Checkout
        </Button>
        {!canCheckout && (
          <p className="text-center text-xs text-signal-red">
            {cart.lines.some((line) => line.quantity > line.onHand)
              ? "Adjust quantities for items exceeding available stock before checking out."
              : "Remove unavailable items before checking out."}
          </p>
        )}
      </div>
    </div>
  );
}
