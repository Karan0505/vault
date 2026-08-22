import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/session";
import { getOrCreateCart, getCartView } from "@/lib/cart/cart.server";
import { formatMoney } from "@/lib/payments/money";
import { applyDiscountCode } from "@/lib/checkout/discounts.server";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

interface CheckoutPageProps {
  searchParams: Promise<{ discount?: string }>;
}

async function CheckoutSummary({ userId, discountCode }: { userId: string; discountCode?: string }) {
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
      // ignore invalid discount in preview
    }
  }

  const shippingAmount = freeShipping ? 0 : 599;
  const taxAmount = 0;
  const totalAmount = Math.max(0, view.subtotal - discountAmount + shippingAmount + taxAmount);

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
      <div className="flex flex-col gap-2 border-t border-gray-200 pt-3 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-mono font-medium text-gray-900">{formatMoney({ amount: view.subtotal, currency })}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-emerald-600 font-medium">
            <span>Discount ({discountCode})</span>
            <span className="font-mono">−{formatMoney({ amount: discountAmount, currency })}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Shipping</span>
          <span className="font-mono font-medium text-gray-900">
            {shippingAmount === 0 ? "Free" : formatMoney({ amount: shippingAmount, currency })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span className="font-mono font-medium text-gray-900">{formatMoney({ amount: taxAmount, currency })}</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-2.5 text-xs font-bold text-gray-900">
          <span>Total</span>
          <span className="font-mono text-sm">{formatMoney({ amount: totalAmount, currency })}</span>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Server authoritative calculations guarantee your items are held safely without risk of overselling.
      </p>
    </div>
  );
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { discount } = await searchParams;
  const userId = await getCurrentUserId();

  if (!userId) {
    const targetUrl = `/checkout${discount ? `?discount=${encodeURIComponent(discount)}` : ""}`;
    redirect(`/login?redirect=${encodeURIComponent(targetUrl)}`);
  }

  return (
    <div className="mx-auto max-w-5xl py-6">
      <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
        <div>
          <CheckoutForm initialDiscountCode={discount} />
        </div>
        <div>
          <Suspense fallback={<div className="skeleton h-64 rounded-3xl" />}>
            <CheckoutSummary userId={userId} discountCode={discount} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

