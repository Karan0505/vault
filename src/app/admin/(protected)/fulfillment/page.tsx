import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/payments/money";
import { FulfillmentClient, type FulfillmentOrder } from "@/components/admin/fulfillment/FulfillmentClient";

export default async function AdminFulfillmentPage() {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["paid", "fulfilled", "delivered"] },
    },
    include: {
      items: true,
      fulfillments: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const formattedOrders: FulfillmentOrder[] = orders.map((o) => ({
    id: o.id,
    number: o.number,
    email: o.email,
    status: o.status,
    totalAmount: formatMoney({ amount: o.totalAmount, currency: o.currency || "USD" }),
    createdAt: o.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    shippingAddress: o.shippingAddress,
    items: o.items.map((it) => ({
      id: it.id,
      titleSnapshot: it.titleSnapshot,
      skuSnapshot: it.skuSnapshot,
      quantity: it.quantity,
      fulfilledQuantity: it.fulfilledQuantity,
      unitAmount: formatMoney({ amount: it.unitAmount, currency: o.currency || "USD" }),
    })),
    fulfillments: o.fulfillments.map((f) => ({
      id: f.id,
      trackingNumber: f.trackingNumber,
      carrier: f.carrier,
      createdAt: f.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })),
  }));

  const stats = {
    unfulfilledCount: formattedOrders.filter((o) => o.status === "paid").length,
    inTransitCount: formattedOrders.filter((o) => o.status === "fulfilled").length,
    deliveredCount: formattedOrders.filter((o) => o.status === "delivered").length,
  };

  return <FulfillmentClient orders={formattedOrders} stats={stats} />;
}
