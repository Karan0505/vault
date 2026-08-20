import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/payments/money";
import { RefundsClient, type RefundRecord, type EligibleOrder } from "@/components/admin/refunds/RefundsClient";

export default async function AdminRefundsPage() {
  const [refundsList, eligibleOrdersList, refundsAgg, restockedLineItemsCount] = await Promise.all([
    prisma.refund.findMany({
      include: {
        order: true,
        items: {
          include: {
            orderItem: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["paid", "fulfilled", "delivered"] },
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.refund.aggregate({
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.refundLineItem.count(),
  ]);

  const formattedRefunds: RefundRecord[] = refundsList.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    orderNumber: r.order.number,
    customerEmail: r.order.email,
    amount: formatMoney({ amount: r.amount, currency: r.order.currency || "USD" }),
    rawAmount: r.amount,
    reason: r.reason,
    stripeRefundId: r.stripeRefundId,
    restocked: r.restocked,
    createdAt: r.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    items: r.items.map((it) => ({
      id: it.id,
      quantity: it.quantity,
      title: it.orderItem?.titleSnapshot || "Item",
    })),
  }));

  const eligibleOrders: EligibleOrder[] = eligibleOrdersList.map((o) => ({
    id: o.id,
    number: o.number,
    email: o.email,
    status: o.status,
    totalAmount: formatMoney({ amount: o.totalAmount, currency: o.currency || "USD" }),
    items: o.items.map((it) => ({
      id: it.id,
      titleSnapshot: it.titleSnapshot,
      quantity: it.quantity,
      refundedQuantity: it.refundedQuantity,
      unitAmount: formatMoney({ amount: it.unitAmount, currency: o.currency || "USD" }),
    })),
  }));

  const totalRefundedRaw = refundsAgg._sum.amount ?? 0;
  const totalRefundCount = refundsAgg._count.id ?? 0;

  const stats = {
    totalRefunded: formatMoney({ amount: totalRefundedRaw, currency: "USD" }),
    refundCount: totalRefundCount,
    restockedCount: restockedLineItemsCount,
  };

  return <RefundsClient refunds={formattedRefunds} eligibleOrders={eligibleOrders} stats={stats} />;
}
