import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, Clock } from "lucide-react";

import { auth, verifyOrderAccess } from "@/lib/auth";

export const metadata: Metadata = { title: "Order confirmed" };

interface SuccessPageProps {
  searchParams: Promise<{ order_id?: string; token?: string }>;
}

import { stripe } from "@/lib/stripe";
import { markOrderPaidByPaymentIntent } from "@/lib/orders.server";

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const { order_id: orderId, token } = await searchParams;
  if (!orderId) notFound();

  const session = await auth();

  let order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) notFound();

  if (!verifyOrderAccess(order, session, token ?? null)) {
    notFound();
  }

  if (order.status === "pending" && order.stripePaymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
      if (pi.status === "succeeded") {
        await prisma.$transaction(async (tx) => {
          await markOrderPaidByPaymentIntent(tx, pi.id);
        });
        order = (await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })) ?? order;
      }
    } catch {
      // Ignore if Stripe call fails
    }
  }

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
        <div className="ledger-rule flex flex-col gap-2.5 pt-3 font-mono text-sm">
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
            <span>{order.shippingAmount === 0 ? "Free" : formatMoney({ amount: order.shippingAmount, currency: order.currency })}</span>
          </div>
          <div className="ledger-rule flex justify-between pt-2.5 text-base text-ink-50 font-medium">
            <span>Total</span>
            <span>{formatMoney({ amount: order.totalAmount, currency: order.currency })}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <Link
          href={`/orders/${order.id}${order.guestToken ? `?token=${order.guestToken}` : ""}`}
          className="text-brass-300 hover:text-brass-200"
        >
          Track this order →
        </Link>
        <Link href="/" className="text-ink-500 hover:text-ink-300">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
