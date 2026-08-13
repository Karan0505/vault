import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUserId } from "@/lib/session";
import { getOrCreateCart, getCartView } from "@/lib/cart.server";
import { formatMoney } from "@/lib/money";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

interface CheckoutPageProps {
  searchParams: Promise<{ discount?: string }>;
}

async function CheckoutSummary() {
  const userId = await getCurrentUserId();
  const cart = await getOrCreateCart(userId);
  const view = await getCartView(cart.id);
  const currency = view.currency ?? "USD";

  const shippingAmount = 599;
  const totalAmount = view.subtotal + shippingAmount;

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
        <div className="flex justify-between text-ink-400">
          <span>Shipping</span>
          <span>{formatMoney({ amount: shippingAmount, currency })}</span>
        </div>
        <div className="ledger-rule flex justify-between pt-2.5 text-base font-semibold text-ink-50">
          <span>Total</span>
          <span>{formatMoney({ amount: totalAmount, currency })}</span>
        </div>
      </div>
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
          <CheckoutSummary />
        </Suspense>
      </div>
    </div>
  );
}
