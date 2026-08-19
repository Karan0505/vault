"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CartLineItem } from "./CartLineItem";
import { DiscountCodeForm } from "./DiscountCodeForm";
import { formatMoney } from "@/lib/money";
import type { CartView } from "@/lib/cart.server";

interface AppliedDiscount {
  code: string;
  totalDiscount: number;
  freeShipping: boolean;
}

const FLAT_SHIPPING_AMOUNT = 0; // matching reference where shipping is $0.00 / free threshold

export function CartPageBody() {
  const router = useRouter();
  const [cart, setCart] = useState<CartView | null>(null);
  const [discount, setDiscount] = useState<AppliedDiscount | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

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

  async function handleCheckout() {
    if (isRedirecting) return;
    setIsRedirecting(true);

    const targetUrl = `/checkout${discount ? `?discount=${encodeURIComponent(discount.code)}` : ""}`;

    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) {
        router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`);
        return;
      }
      const data = await res.json();
      if (data?.user?.id) {
        router.push(targetUrl);
      } else {
        router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`);
      }
    } catch {
      router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`);
    }
  }

  if (!cart) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-sans text-lg font-semibold text-gray-800">Your cart is empty</p>
        <p className="text-xs text-gray-500">Looks like you haven&apos;t added anything yet.</p>
        <Link
          href="/"
          className="mt-3 inline-flex items-center rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-gray-800 transition-colors"
        >
          Explore Catalog →
        </Link>
      </div>
    );
  }

  const shippingAmount = discount?.freeShipping ? 0 : FLAT_SHIPPING_AMOUNT;
  const discountAmount = discount?.totalDiscount ?? 0;
  const total = Math.max(0, cart.subtotal - discountAmount + shippingAmount);
  const currency = cart.currency ?? "USD";
  const canCheckout = cart.lines.every((line) => line.isEnabled) && cart.lines.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Cart Lines */}
      <div className="flex flex-col divide-y divide-gray-100">
        {cart.lines.map((line) => (
          <CartLineItem key={line.itemId} line={line} onChanged={refresh} />
        ))}
      </div>

      {/* Discount form */}
      <div className="border-t border-gray-100 pt-4">
        <DiscountCodeForm
          onApplied={(code, preview) =>
            setDiscount({
              code,
              totalDiscount: preview.totalDiscount ?? 0,
              freeShipping: Boolean(preview.freeShipping),
            })
          }
        />
      </div>

      {/* Price breakdown */}
      <div className="flex flex-col gap-2 rounded-2xl bg-gray-50 p-4 font-sans text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-semibold text-gray-900">{formatMoney({ amount: cart.subtotal, currency })}</span>
        </div>
        <AnimatePresence>
          {discount && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex justify-between text-emerald-600 font-medium"
            >
              <span>Discount ({discount.code})</span>
              <span>
                {discount.freeShipping ? "Free" : `−${formatMoney({ amount: discount.totalDiscount, currency })}`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span className="font-semibold text-gray-900">
            {shippingAmount === 0 ? "$0.00" : formatMoney({ amount: shippingAmount, currency })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span className="font-semibold text-gray-900">$0.00</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-2.5 font-sans text-sm font-bold text-gray-900">
          <span>Total</span>
          <span>{formatMoney({ amount: total, currency })}</span>
        </div>
      </div>

      {/* Checkout CTA */}
      <button
        type="button"
        disabled={!canCheckout || isRedirecting}
        onClick={handleCheckout}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] cursor-pointer"
      >
        {isRedirecting ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            <span>Checking authentication...</span>
          </>
        ) : (
          <span>Checkout</span>
        )}
      </button>

      {!canCheckout && (
        <p className="text-center text-xs text-rose-600 font-medium">
          Please remove unavailable items before checking out.
        </p>
      )}
    </div>
  );
}

