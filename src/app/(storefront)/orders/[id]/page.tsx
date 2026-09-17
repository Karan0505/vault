import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Check, ChevronRight, Package, Truck, CreditCard, ShoppingBag } from "lucide-react";
import { auth, verifyOrderAccess } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/payments/money";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders/orders";
import { OrderLiveTracker } from "@/components/storefront/OrderLiveTracker";
import { OrderActions } from "@/components/storefront/OrderActions";

export const metadata: Metadata = { title: "Order Details" };

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

const TIMELINE_STEPS = [
  { key: "pending", label: "Order Placed", icon: ShoppingBag },
  { key: "paid", label: "Paid", icon: CreditCard },
  { key: "fulfilled", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Package },
];

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  const session = await auth();

  const order = await prisma.order.findFirst({
    where: { OR: [{ id }, { number: id }] },
    include: {
      fulfillments: {
        orderBy: { createdAt: "desc" },
      },
      refunds: true,
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

  // Strict Customer Isolation: Verify ownership or staff privileges
  const hasAccess = verifyOrderAccess(order, session, null);
  if (!hasAccess) {
    notFound();
  }

  const stepOrder: OrderStatus[] = ["pending", "paid", "fulfilled", "delivered"];
  const currentStepIndex = stepOrder.indexOf(order.status as OrderStatus);
  const latestFulfillment = order.fulfillments[0] ?? null;

  const isFailed = (order.status as OrderStatus) === "failed";
  const isCancelled = (order.status as OrderStatus) === "cancelled";

  return (
    <div className="mx-auto max-w-4xl py-6 flex flex-col gap-8">
      <OrderLiveTracker orderId={order.id} initialStatus={order.status} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:text-black dark:hover:text-white transition-colors">
          Home
        </Link>
        <ChevronRight size={12} className="text-gray-400 dark:text-gray-500" />
        <Link href="/account" className="hover:text-black dark:hover:text-white transition-colors">
          Orders
        </Link>
        <ChevronRight size={12} className="text-gray-400 dark:text-gray-500" />
        <span className="font-medium text-gray-900 dark:text-white">#{order.number}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-ink-800 pb-6">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Order #{order.number}
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Placed on {order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {order.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric" })}
          </p>
        </div>

        <div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold border ${
              isFailed
                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                : isCancelled
                ? "bg-gray-100 dark:bg-ink-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-ink-700"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isFailed ? "bg-rose-500" : isCancelled ? "bg-gray-400" : "bg-emerald-500"
              }`}
            />
            {order.status === "fulfilled" ? "Shipped" : ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      {/* Visual 4-Step Progress Tracker */}
      {!isFailed && !isCancelled && (
        <div className="rounded-3xl border border-gray-200/80 dark:border-ink-800 bg-gray-50/50 dark:bg-ink-900/50 p-6 sm:p-8">
          <div className="relative flex items-center justify-between">
            {/* Connector line */}
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 dark:bg-ink-800 -z-0" />
            <div
              className="absolute top-4 left-6 h-0.5 bg-emerald-500 transition-all duration-500 -z-0"
              style={{
                width: `${Math.max(0, Math.min(100, (currentStepIndex / (stepOrder.length - 1)) * 100))}%`,
              }}
            />

            {TIMELINE_STEPS.map((step, idx) => {
              const isCompleted = currentStepIndex >= idx || order.status === "delivered";
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                      isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
                        : "border-gray-300 dark:border-ink-700 bg-white dark:bg-ink-900 text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {isCompleted ? <Check size={14} strokeWidth={3} /> : <span className="text-xs">{idx + 1}</span>}
                  </div>
                  <div className="text-center">
                    <p className={`text-xs font-bold ${isCurrent || isCompleted ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                      {step.label}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                      {order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shipment & Tracking Details (when fulfilled/shipped) */}
      {latestFulfillment && (
        <div className="rounded-3xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30">
                <Truck size={20} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Shipment on the Way</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Carrier: <span className="font-semibold text-gray-800 dark:text-gray-200">{latestFulfillment.carrier || "VAULT Express"}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:items-end">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-mono">Tracking Number</span>
              <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/50 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 mt-0.5">
                {latestFulfillment.trackingNumber}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Customer Cancellation, Return & Failure Recovery Action Controls */}
      <OrderActions
        orderId={order.id}
        orderNumber={order.number}
        status={order.status}
        trackingNumber={latestFulfillment?.trackingNumber}
        failureReason={(order as { failureReason?: string | null }).failureReason}
        refundInitiatedAt={(order as { refundInitiatedAt?: Date | string | null }).refundInitiatedAt}
        hasRefunds={order.refunds.length > 0}
      />

      {/* Grid for Items & Details */}
      <div className="grid gap-8 sm:grid-cols-12">
        {/* Items List */}
        <div className="rounded-3xl border border-gray-200/80 dark:border-ink-800 bg-white dark:bg-ink-900 p-6 sm:col-span-7 shadow-xs">
          <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white pb-4 border-b border-gray-100 dark:border-ink-800">
            Items
          </h3>
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-ink-800">
            {order.items.map((item) => {
              const imageUrl = item.variant?.product?.media?.[0]?.url ?? null;

              return (
                <div key={item.id} className="flex items-center justify-between py-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-ink-800 border border-gray-200 dark:border-ink-700">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={item.titleSnapshot}
                          fill
                          sizes="56px"
                          className="object-cover object-center"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-sans text-xs text-gray-400 dark:text-gray-500">
                          📦
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{item.titleSnapshot}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                        {item.optionsSnapshot && typeof item.optionsSnapshot === "object"
                          ? Object.values(item.optionsSnapshot as Record<string, string>).join(" / ") + " · "
                          : ""}
                        Qty {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {formatMoney({ amount: item.lineTotal, currency: order.currency })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipping Address & Cost summary */}
        <div className="flex flex-col gap-6 sm:col-span-5">
          {/* Address card */}
          <div className="rounded-3xl border border-gray-200/80 dark:border-ink-800 bg-white dark:bg-ink-900 p-6 shadow-xs">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">Shipping Address</h3>
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 space-y-1">
              {(() => {
                const shippingAddr = order.shippingAddress as {
                  fullName?: string;
                  address?: string;
                  apartment?: string;
                  city?: string;
                  state?: string;
                  zip?: string;
                  country?: string;
                  phone?: string;
                } | null;
                if (shippingAddr && typeof shippingAddr === "object") {
                  return (
                    <>
                      <p className="font-semibold text-gray-900 dark:text-white">{shippingAddr.fullName || order.email}</p>
                      <p>
                        {shippingAddr.address}
                        {shippingAddr.apartment ? `, ${shippingAddr.apartment}` : ""}
                      </p>
                      <p>
                        {shippingAddr.city}, {shippingAddr.state} {shippingAddr.zip}
                      </p>
                      <p>{shippingAddr.country}</p>
                      {shippingAddr.phone && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">Phone: {shippingAddr.phone}</p>
                      )}
                    </>
                  );
                }
                return (
                  <>
                    <p className="font-semibold text-gray-900 dark:text-white">{order.email}</p>
                    <p className="text-gray-500 dark:text-gray-400">Standard Delivery</p>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Payment summary card */}
          <div className="rounded-3xl border border-gray-200/80 dark:border-ink-800 bg-gray-50 dark:bg-ink-900/50 p-6 shadow-xs font-sans text-xs text-gray-600 dark:text-gray-400 space-y-2.5">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatMoney({ amount: order.subtotalAmount, currency: order.currency })}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Discount</span>
                <span>−{formatMoney({ amount: order.discountAmount, currency: order.currency })}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-semibold text-gray-900 dark:text-white">{order.shippingAmount === 0 ? "$0.00" : formatMoney({ amount: order.shippingAmount, currency: order.currency })}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatMoney({ amount: order.taxAmount, currency: order.currency })}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 dark:border-ink-800 pt-2.5 text-sm font-bold text-gray-900 dark:text-white">
              <span>Total</span>
              <span>{formatMoney({ amount: order.totalAmount, currency: order.currency })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

