import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Clock, CheckCircle2, Truck, CreditCard, ShieldAlert, ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { OrderActions } from "@/components/admin/OrderActions";
import { formatMoney } from "@/lib/money";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  const role = session?.user.staffRole ?? null;

  const order = await prisma.order.findFirst({
    where: { OR: [{ id }, { number: id }] },
    include: {
      items: true,
      fulfillments: { include: { items: true }, orderBy: { createdAt: "desc" } },
      refunds: { include: { items: true }, orderBy: { createdAt: "desc" } },
      discount: true,
    },
  });

  if (!order) notFound();

  const timelineEvents = [
    {
      time: order.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric" }),
      date: order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      title: "Order placed",
      desc: `Shopper entered checkout with email ${order.email}`,
      icon: CheckCircle2,
      color: "text-emerald-400",
    },
    {
      time: order.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric" }),
      date: order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      title: "Payment succeeded",
      desc: `Stripe authorized ${formatMoney({ amount: order.totalAmount, currency: order.currency })}`,
      icon: CreditCard,
      color: "text-indigo-400",
    },
    ...(order.fulfillments.length > 0
      ? order.fulfillments.map((f) => ({
          time: f.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric" }),
          date: f.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          title: `Shipped via ${f.carrier ?? "Carrier"}`,
          desc: `Tracking number: ${f.trackingNumber}`,
          icon: Truck,
          color: "text-blue-400",
        }))
      : []),
    ...(order.status === "delivered"
      ? [
          {
            time: "2:15 PM",
            date: "May 21",
            title: "Delivered",
            desc: "Package delivered to recipient address",
            icon: CheckCircle2,
            color: "text-emerald-400",
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6 text-slate-100">
      {/* Header with Breadcrumb and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Link href="/admin/orders" className="text-slate-400 hover:text-white flex items-center gap-1">
            <ArrowLeft size={13} />
            <span>Orders</span>
          </Link>
          <ChevronRight size={13} className="text-slate-600" />
          <span className="font-bold text-white">#{order.number}</span>
        </div>

        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-300">
            Stripe Paid
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Left Panels */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* Order Summary Box */}
          <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
            <h3 className="font-sans text-sm font-bold text-white border-b border-[#1E293B] pb-3.5 mb-4">
              Order Summary
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="font-sans text-slate-400">Customer</span>
                <p className="font-sans font-semibold text-white mt-1">{order.email}</p>
              </div>
              <div>
                <span className="font-sans text-slate-400">Date</span>
                <p className="font-sans font-semibold text-white mt-1">
                  {order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {order.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric" })}
                </p>
              </div>
              <div>
                <span className="font-sans text-slate-400">Payment</span>
                <p className="font-sans font-semibold text-white mt-1">Paid [Stripe Test]</p>
              </div>
              <div>
                <span className="font-sans text-slate-400">Shipping</span>
                <p className="font-sans font-semibold text-white mt-1">
                  Standard Shipping ({order.shippingAmount === 0 ? "Free" : formatMoney({ amount: order.shippingAmount, currency: order.currency })})
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-[#1E293B] pt-4 flex justify-between font-mono font-bold text-base text-white">
              <span>Total</span>
              <span className="text-emerald-400">{formatMoney({ amount: order.totalAmount, currency: order.currency })}</span>
            </div>
          </div>

          {/* Items Breakdown Table */}
          <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
            <h3 className="font-sans text-sm font-bold text-white border-b border-[#1E293B] pb-3.5 mb-4">
              Items ({order.items.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-b border-[#1E293B] font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5">Item</th>
                    <th className="py-2.5">Variant</th>
                    <th className="py-2.5">Qty</th>
                    <th className="py-2.5">Price</th>
                    <th className="py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {order.items.map((item) => (
                    <tr key={item.id} className="text-slate-300">
                      <td className="py-3 font-semibold text-white">{item.titleSnapshot}</td>
                      <td className="py-3 font-mono text-slate-400 text-[11px]">
                        {Object.values(item.optionsSnapshot as Record<string, string>).join(" / ")}
                      </td>
                      <td className="py-3">{item.quantity}</td>
                      <td className="py-3 font-mono">{formatMoney({ amount: item.unitAmount, currency: order.currency })}</td>
                      <td className="py-3 text-right font-mono font-bold text-white">
                        {formatMoney({ amount: item.lineTotal, currency: order.currency })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fulfill / Cancel / Refund Actions */}
          <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
            <h3 className="font-sans text-sm font-bold text-white border-b border-[#1E293B] pb-3.5 mb-4">
              Fulfillment & Operations
            </h3>
            <OrderActions
              orderId={order.id}
              status={order.status}
              items={order.items.map((i) => ({
                id: i.id,
                titleSnapshot: i.titleSnapshot,
                quantity: i.quantity,
                fulfilledQuantity: i.fulfilledQuantity,
                refundedQuantity: i.refundedQuantity,
              }))}
              canFulfil={hasPermission(role, "orders:fulfil")}
              canCancel={hasPermission(role, "orders:cancel")}
              canRefund={hasPermission(role, "refunds:issue")}
            />
          </div>
        </div>

        {/* Right Sidebar: Timeline Activity Feed */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel">
            <h3 className="font-sans text-sm font-bold text-white border-b border-[#1E293B] pb-3.5 mb-5 flex items-center gap-2">
              <Clock size={15} className="text-indigo-400" />
              <span>Timeline Activity</span>
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1E293B]">
              {timelineEvents.map((evt, idx) => {
                const Icon = evt.icon;
                return (
                  <div key={idx} className="relative flex flex-col gap-1">
                    <div className="absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#111827] ring-4 ring-[#111827]">
                      <Icon size={14} className={evt.color} />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-sans text-xs font-bold text-white">{evt.title}</span>
                      <span className="font-mono text-[10px] text-slate-500">{evt.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{evt.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

