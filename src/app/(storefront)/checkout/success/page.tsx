import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Order confirmed" };

interface SuccessPageProps {
  searchParams: Promise<{ order_id?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const { order_id: orderId } = await searchParams;
  if (!orderId) notFound();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) notFound();

  const isPaid = order.status !== "pending";

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-16 text-center">
      {isPaid ? (
        <CheckCircle2 size={40} className="text-signal-green" strokeWidth={1.5} />
      ) : (
        <Clock size={40} className="text-signal-amber" strokeWidth={1.5} />
      )}

      <div>
        <h1 className="font-display text-3xl italic text-ink-50">
          {isPaid ? "Order confirmed" : "Confirming your payment…"}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          {isPaid
            ? `Order ${order.number} is on its way to being packed.`
            : "This updates automatically the moment Stripe confirms your payment — usually within a few seconds. Refresh if it's been a while."}
        </p>
      </div>

      <Badge tone={isPaid ? "green" : "amber"}>{ORDER_STATUS_LABEL[order.status]}</Badge>

      <div className="w-full rounded-2xl border border-ink-700 bg-ink-900/50 p-6 text-left">
        <div className="flex flex-col divide-y divide-ink-800">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-3 text-sm">
              <span className="text-ink-300">
                {item.titleSnapshot} × {item.quantity}
              </span>
              <span className="font-mono text-ink-200">
                {formatMoney({ amount: item.lineTotal, currency: order.currency })}
              </span>
            </div>
          ))}
        </div>
        <div className="ledger-rule flex justify-between pt-3 font-mono text-sm text-ink-50">
          <span>Total</span>
          <span>{formatMoney({ amount: order.totalAmount, currency: order.currency })}</span>
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <Link href={`/orders/${order.id}`} className="text-brass-300 hover:text-brass-200">
          Track this order →
        </Link>
        <Link href="/" className="text-ink-500 hover:text-ink-300">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
