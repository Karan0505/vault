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

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-gray-200/80 bg-gray-50/70 p-6 shadow-xs">
      <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-gray-900">Order Summary</h3>
      <div className="flex flex-col divide-y divide-gray-200/70">
        {view.lines.map((line) => (
          <div key={line.itemId} className="flex justify-between gap-4 py-3 text-xs">
            <span className="font-medium text-gray-800">
              {line.productTitle} × {line.quantity}
            </span>
            <span className="font-mono font-semibold text-gray-900">{formatMoney({ amount: line.lineTotal, currency })}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between border-t border-gray-200 pt-3 text-xs font-bold text-gray-900">
        <span>Subtotal</span>
        <span className="font-mono">{formatMoney({ amount: view.subtotal, currency })}</span>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Server authoritative calculations guarantee your items are held safely without risk of overselling.
      </p>
    </div>
  );
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { discount } = await searchParams;

  return (
    <div className="mx-auto max-w-5xl py-6">
      <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
        <div>
          <CheckoutForm initialDiscountCode={discount} />
        </div>
        <div>
          <Suspense fallback={<div className="skeleton h-64 rounded-3xl" />}>
            <CheckoutSummary />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

