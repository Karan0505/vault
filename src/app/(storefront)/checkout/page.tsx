import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUserId } from "@/lib/session";
import { getOrCreateCart, getCartView } from "@/lib/cart.server";
import { applyDiscountCode } from "@/lib/discounts.server";
import { formatMoney } from "@/lib/money";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

interface CheckoutPageProps {
  searchParams: Promise<{ discount?: string }>;
}

const FLAT_SHIPPING_AMOUNT = 599;

async function CheckoutSummary({ discountCode }: { discountCode?: string }) {
  const userId = await getCurrentUserId();
  const cart = await getOrCreateCart(userId);
  const view = await getCartView(cart.id);
  const currency = view.currency ?? "USD";

  let discountAmount = 0;
  let freeShipping = false;

  if (discountCode) {
    try {
      const { result } = await applyDiscountCode(
        discountCode,
        view.lines.map((l) => ({ variantId: l.variantId, unitAmount: l.unitAmount, quantity: l.quantity })),
        userId
      );
      if (result.eligible) {
        discountAmount = result.totalDiscount;
        freeShipping = result.freeShipping;
      }
    } catch {
      // Ignore invalid/expired code in summary preview
    }
  }

  const shippingAmount = freeShipping ? 0 : FLAT_SHIPPING_AMOUNT;
  const total = view.subtotal - discountAmount + shippingAmount;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink-700 bg-ink-900/50 p-6">
      <p className="eyebrow">Order summary</p>
      <div className="flex flex-col divide-y divide-ink-800">
        {view.lines.map((line) => (
          <div key={line.itemId} className="flex justify-between gap-4 py-3 text-sm">
            <span className="text-ink-300">
              {line.productTitle} × {line.quantity}
            </span>
            <span className="font-mono text-ink-200">{formatMoney({ amount: line.lineTotal, currency })}</span>
          </div>
        ))}
      </div>
      <div className="ledger-rule flex flex-col gap-2.5 pt-3 font-mono text-sm">
        <div className="flex justify-between text-ink-400">
          <span>Subtotal</span>
          <span>{formatMoney({ amount: view.subtotal, currency })}</span>
        </div>
        {discountCode && discountAmount > 0 && (
          <div className="flex justify-between text-signal-green">
            <span>Discount ({discountCode})</span>
            <span>−{formatMoney({ amount: discountAmount, currency })}</span>
          </div>
        )}
        <div className="flex justify-between text-ink-400">
          <span>Shipping</span>
          <span>{shippingAmount === 0 ? "Free" : formatMoney({ amount: shippingAmount, currency })}</span>
        </div>
        <div className="ledger-rule flex justify-between pt-2.5 text-base text-ink-50">
          <span>Total</span>
          <span>{formatMoney({ amount: total, currency })}</span>
        </div>
      </div>
      <p className="text-xs text-ink-600">
        Shipping, discounts, and the final total are computed server-side from exactly what's in your cart right now.
      </p>
    </div>
  );
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { discount } = await searchParams;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="order-2 lg:order-1">
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-2 font-display text-3xl italic text-ink-50">Complete your order</h1>
        <div className="mt-8 max-w-md">
          <CheckoutForm initialDiscountCode={discount} />
        </div>
      </div>
      <div className="order-1 lg:order-2">
        <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}>
          <CheckoutSummary discountCode={discount} />
        </Suspense>
      </div>
    </div>
  );
}
