import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

import { PaymentStatusPoller } from "@/components/checkout/PaymentStatusPoller";

export const metadata: Metadata = { title: "Order" };

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

const TIMELINE: OrderStatus[] = ["pending", "paid", "fulfilled", "delivered"];

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();

  const isCancelledOrRefunded = order.status === "cancelled" || order.status === "refunded";
  const currentIndex = TIMELINE.indexOf(order.status);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-10">
      <PaymentStatusPoller orderId={order.id} initialStatus={order.status} />
      <div>
        <p className="eyebrow">Order {order.number}</p>
        <h1 className="mt-2 font-display text-3xl italic text-ink-50">Order status</h1>
        <p className="mt-1 text-sm text-ink-500">{order.email}</p>
      </div>

      {isCancelledOrRefunded ? (
        <Badge tone={order.status === "cancelled" ? "neutral" : "red"} className="w-fit">
          {ORDER_STATUS_LABEL[order.status]}
        </Badge>
      ) : (
        <div className="flex items-center">
          {TIMELINE.map((step, index) => (
            <div key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border font-mono text-xs",
                    index <= currentIndex
                      ? "border-brass-400 bg-brass-400/10 text-brass-300"
                      : "border-ink-700 text-ink-600"
                  )}
                >
                  {index + 1}
                </div>
                <span
                  className={cn(
                    "whitespace-nowrap text-xs",
                    index <= currentIndex ? "text-ink-200" : "text-ink-600"
                  )}
                >
                  {ORDER_STATUS_LABEL[step]}
                </span>
              </div>
              {index < TIMELINE.length - 1 && (
                <div className={cn("mx-2 h-px flex-1", index < currentIndex ? "bg-brass-400" : "bg-ink-700")} />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-ink-700 bg-ink-900/50 p-6">
        <div className="flex flex-col divide-y divide-ink-800">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-3 text-sm">
              <div>
                <p className="text-ink-200">{item.titleSnapshot}</p>
                <p className="font-mono text-xs text-ink-600">
                  {Object.values(item.optionsSnapshot as Record<string, string>).join(" / ")} · Qty {item.quantity}
                </p>
              </div>
              <span className="font-mono text-ink-200">
                {formatMoney({ amount: item.lineTotal, currency: order.currency })}
              </span>
            </div>
          ))}
        </div>
        <div className="ledger-rule flex flex-col gap-1.5 pt-3 font-mono text-sm">
          <div className="flex justify-between text-ink-400">
            <span>Subtotal</span>
            <span>{formatMoney({ amount: order.subtotalAmount, currency: order.currency })}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-signal-green">
              <span>Discount</span>
              <span>−{formatMoney({ amount: order.discountAmount, currency: order.currency })}</span>
            </div>
          )}
          <div className="flex justify-between text-ink-400">
            <span>Shipping</span>
            <span>{formatMoney({ amount: order.shippingAmount, currency: order.currency })}</span>
          </div>
          <div className="flex justify-between pt-1.5 text-base text-ink-50">
            <span>Total</span>
            <span>{formatMoney({ amount: order.totalAmount, currency: order.currency })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
