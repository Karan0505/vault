import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Check, ChevronRight, Package, Truck, CreditCard, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";

export const metadata: Metadata = { title: "Order Details" };

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

const TIMELINE_STEPS = [
  { key: "pending", label: "Order Placed", icon: ShoppingBag, date: "May 18" },
  { key: "paid", label: "Paid", icon: CreditCard, date: "May 18" },
  { key: "fulfilled", label: "Shipped", icon: Truck, date: "May 19" },
  { key: "delivered", label: "Delivered", icon: Package, date: "May 21" },
];

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { OR: [{ id }, { number: id }] },
    include: { items: true },
  });
  if (!order) notFound();

  const stepOrder: OrderStatus[] = ["pending", "paid", "fulfilled", "delivered"];
  const currentStepIndex = stepOrder.indexOf(order.status as OrderStatus);

  return (
    <div className="mx-auto max-w-4xl py-6 flex flex-col gap-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/" className="hover:text-black transition-colors">
          Home
        </Link>
        <ChevronRight size={12} className="text-gray-400" />
        <Link href="/account" className="hover:text-black transition-colors">
          Orders
        </Link>
        <ChevronRight size={12} className="text-gray-400" />
        <span className="font-medium text-gray-900">#{order.number}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Order #{order.number}
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Placed on {order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {order.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric" })}
          </p>
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      {/* Visual 4-Step Progress Tracker */}
      <div className="rounded-3xl border border-gray-200/80 bg-gray-50/50 p-6 sm:p-8">
        <div className="relative flex items-center justify-between">
          {/* Connector line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 -z-0" />
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
                      : "border-gray-300 bg-white text-gray-400"
                  }`}
                >
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : <span className="text-xs">{idx + 1}</span>}
                </div>
                <div className="text-center">
                  <p className={`text-xs font-bold ${isCurrent || isCompleted ? "text-gray-900" : "text-gray-400"}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                    {order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid for Items & Details */}
      <div className="grid gap-8 sm:grid-cols-12">
        {/* Items List */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:col-span-7 shadow-xs">
          <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-gray-900 pb-4 border-b border-gray-100">
            Items
          </h3>
          <div className="flex flex-col divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 border border-gray-200 font-sans text-xs text-gray-500">
                    📦
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.titleSnapshot}</p>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                      {Object.values(item.optionsSnapshot as Record<string, string>).join(" / ")} · Qty {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="font-mono font-bold text-gray-900">
                  {formatMoney({ amount: item.lineTotal, currency: order.currency })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping Address & Cost summary */}
        <div className="flex flex-col gap-6 sm:col-span-5">
          {/* Address card */}
          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-900">Shipping Address</h3>
            <div className="mt-3 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-900">{order.email}</p>
              <p>123 Main Street</p>
              <p>San Francisco, CA 94103</p>
              <p>United States</p>
            </div>
          </div>

          {/* Payment summary card */}
          <div className="rounded-3xl border border-gray-200/80 bg-gray-50 p-6 shadow-xs font-sans text-xs text-gray-600 space-y-2.5">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900">{formatMoney({ amount: order.subtotalAmount, currency: order.currency })}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount</span>
                <span>−{formatMoney({ amount: order.discountAmount, currency: order.currency })}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-semibold text-gray-900">{order.shippingAmount === 0 ? "$0.00" : formatMoney({ amount: order.shippingAmount, currency: order.currency })}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span className="font-semibold text-gray-900">{formatMoney({ amount: order.taxAmount, currency: order.currency })}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2.5 text-sm font-bold text-gray-900">
              <span>Total</span>
              <span>{formatMoney({ amount: order.totalAmount, currency: order.currency })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

