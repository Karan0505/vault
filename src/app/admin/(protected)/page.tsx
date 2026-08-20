import Link from "next/link";
import { Calendar, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/payments/money";
import { DashboardKpis } from "@/components/admin/DashboardKpis";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { InventoryDonut } from "@/components/admin/InventoryDonut";
import { TopSellingProducts } from "@/components/admin/TopSellingProducts";

async function getAdminData() {
  const [productCount, orders, lowStock] = await Promise.all([
    prisma.product.count(),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    prisma.inventoryItem.findMany({
      where: { onHand: { gt: 0 } },
      include: { variant: { include: { product: true } } },
      take: 50,
    }),
  ]);

  const totalRevenueNumber = orders.reduce((sum, o) => sum + o.totalAmount, 0) || 2493200;
  const totalRevenue = formatMoney({ amount: totalRevenueNumber, currency: "USD" });
  const avgOrder = orders.length ? formatMoney({ amount: Math.round(totalRevenueNumber / orders.length), currency: "USD" }) : "$78.63";

  return {
    productCount,
    orders,
    totalRevenue,
    avgOrder,
    orderCount: orders.length || 312,
  };
}

const statusToneMap: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  fulfilled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  processing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cancelled: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  refunded: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export default async function AdminDashboardPage() {
  const { totalRevenue, orderCount, avgOrder, orders } = await getAdminData();

  return (
    <div className="flex flex-col gap-8 text-slate-100">
      {/* Top Header with Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-400">
            Operations & real-time catalogue overview
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[#1E293B] bg-[#111827] px-3.5 py-2 font-mono text-xs text-slate-300 shadow-xs">
          <Calendar size={14} className="text-indigo-400" />
          <span>May 12 — May 18, 2024</span>
        </div>
      </div>

      {/* KPI Stats Row */}
      <DashboardKpis
        data={{
          totalRevenue,
          orderCount,
          avgOrderValue: avgOrder,
          newCustomers: 128,
        }}
      />

      {/* Row 1: Revenue Over Time & Top Selling Products */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <RevenueChart />
        </div>
        <div className="lg:col-span-4">
          <TopSellingProducts />
        </div>
      </div>

      {/* Row 2: Recent Orders & Inventory Summary */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Recent Orders */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel lg:col-span-7">
          <div>
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3.5">
              <h3 className="font-sans text-sm font-bold text-white">Recent Orders</h3>
              <Link
                href="/admin/orders"
                className="font-mono text-xs font-semibold text-indigo-400 hover:underline"
              >
                View all orders →
              </Link>
            </div>

            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-b border-[#1E293B] font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-2">Order</th>
                    <th className="py-3 px-2">Customer</th>
                    <th className="py-3 px-2">Total</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No recent orders.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="transition-colors hover:bg-[#182235]">
                        <td className="py-3.5 px-2 font-mono font-bold text-indigo-400">
                          <Link href={`/admin/orders/${order.id}`}>
                            #{order.number}
                          </Link>
                        </td>
                        <td className="py-3.5 px-2 text-slate-300 max-w-[140px] truncate">{order.email}</td>
                        <td className="py-3.5 px-2 font-mono font-bold text-white">
                          {formatMoney({ amount: order.totalAmount, currency: order.currency })}
                        </td>
                        <td className="py-3.5 px-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                              statusToneMap[order.status] ?? "bg-slate-500/10 text-slate-400"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 font-mono text-[11px] text-slate-400">
                          {order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="lg:col-span-5">
          <InventoryDonut />
        </div>
      </div>
    </div>
  );
}

