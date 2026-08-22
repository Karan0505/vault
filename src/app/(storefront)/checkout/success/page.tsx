import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/payments/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders/orders";
import { Check, Clock, AlertCircle, ShoppingBag, ArrowRight } from "lucide-react";
import { PaymentStatusPoller } from "@/components/checkout/PaymentStatusPoller";
import { syncOrderPaymentStatusWithStripe } from "@/lib/orders/orders.server";

export const metadata: Metadata = { title: "Order Confirmed" };

interface SuccessPageProps {
  searchParams: Promise<{ order_id?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const { order_id: orderId } = await searchParams;
  if (!orderId) notFound();

  let order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  media: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) notFound();

  // If still pending, reconcile with Stripe immediately
  if (order.status === "pending") {
    const updatedStatus = await syncOrderPaymentStatusWithStripe(order.id);
    if (updatedStatus !== order.status) {
      order = (await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      media: true,
                    },
                  },
                },
              },
            },
          },
        },
      })) ?? order;
    }
  }

  const isPaid = order.status !== "pending";
  const isCancelled = order.status === "cancelled";
  const currency = order.currency ?? "USD";

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-8 py-12 px-4 text-center">
      {/* Status Icon */}
      <div className="relative">
        {isPaid ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
            <Check size={32} strokeWidth={3} />
          </div>
        ) : isCancelled ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/25">
            <AlertCircle size={32} strokeWidth={2.5} />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/25 animate-pulse">
            <Clock size={32} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Header Info */}
      <div className="flex flex-col items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
            isPaid
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : isCancelled
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isPaid ? "bg-emerald-500" : isCancelled ? "bg-rose-500" : "bg-amber-500"
            }`}
          />
          {ORDER_STATUS_LABEL[order.status]}
        </span>

        <h1 className="font-sans text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {isPaid
            ? "Order Confirmed!"
            : isCancelled
            ? "Payment Cancelled"
            : "Confirming Your Payment…"}
        </h1>
        <p className="max-w-md text-sm text-gray-600">
          {isPaid
            ? `Thank you for your purchase. Order #${order.number} has been received and is being prepared.`
            : isCancelled
            ? "This order was cancelled or the payment was not completed."
            : "This updates automatically the moment Stripe confirms your payment."}
        </p>
      </div>

      {/* Near-real-time payment status poller */}
      <PaymentStatusPoller orderId={order.id} initialStatus={order.status} />

      {/* Order Summary Card */}
      <div className="w-full rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-xs text-left">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500">
              Order Summary
            </h3>
            <p className="font-sans text-base font-bold text-gray-900">#{order.number}</p>
          </div>
          <span className="text-xs text-gray-500">
            {order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        {/* Items List */}
        <div className="flex flex-col divide-y divide-gray-100 py-2">
          {order.items.map((item) => {
            const imageUrl = item.variant?.product?.media?.[0]?.url ?? null;

            return (
              <div key={item.id} className="flex items-center justify-between py-3.5 text-xs">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 border border-gray-200">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={item.titleSnapshot}
                        fill
                        sizes="48px"
                        className="object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-sans text-xs text-gray-400">
                        📦
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-gray-900">{item.titleSnapshot}</span>
                    <span className="text-gray-500 font-mono text-[11px]">
                      {item.optionsSnapshot && typeof item.optionsSnapshot === "object"
                        ? Object.values(item.optionsSnapshot as Record<string, string>).join(" / ") + " · "
                        : ""}
                      Qty {item.quantity}
                    </span>
                  </div>
                </div>
                <span className="font-mono font-medium text-gray-900">
                  {formatMoney({ amount: item.lineTotal, currency })}
                </span>
              </div>
            );
          })}
        </div>

        {/* Pricing Breakdown */}
        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono font-medium text-gray-900">
              {formatMoney({ amount: order.subtotalAmount, currency })}
            </span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Discount</span>
              <span className="font-mono">−{formatMoney({ amount: order.discountAmount, currency })}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="font-mono font-medium text-gray-900">
              {order.shippingAmount === 0 ? "$0.00" : formatMoney({ amount: order.shippingAmount, currency })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span className="font-mono font-medium text-gray-900">
              {formatMoney({ amount: order.taxAmount, currency })}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-3 text-sm font-bold text-gray-900">
            <span>Total Paid</span>
            <span className="font-mono text-base">{formatMoney({ amount: order.totalAmount, currency })}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex w-full flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-xs transition-all hover:bg-gray-800 active:scale-[0.98]"
        >
          <span>Track this order</span>
          <ArrowRight size={15} />
        </Link>
        <Link
          href="/"
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-xs transition-all hover:bg-gray-50 hover:text-black hover:border-gray-300"
        >
          <ShoppingBag size={15} />
          <span>Continue shopping</span>
        </Link>
      </div>
    </div>
  );
}
