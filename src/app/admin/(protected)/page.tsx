import Link from "next/link";
import { Calendar, ArrowUpRight, Package } from "lucide-react";
import { DashboardKpis } from "@/components/admin/DashboardKpis";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { InventoryDonut } from "@/components/admin/InventoryDonut";
import { TopSellingProducts } from "@/components/admin/TopSellingProducts";
import { getAuthoritativeDashboardData } from "@/lib/admin/dashboard.server";

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
  const data = await getAuthoritativeDashboardData(7);

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
          <span>Last 7 Days (Live)</span>
        </div>
      </div>

      {/* KPI Stats Row */}
      <DashboardKpis
        data={{
          totalRevenue: data.totalRevenue,
          orderCount: data.orderCount,
          avgOrderValue: data.avgOrderValue,
          newCustomers: data.newCustomers,
        }}
      />

      {/* Row 1: Revenue Over Time & Top Selling Products */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <RevenueChart
            dailyPoints={data.dailyPoints}
            weeklyPoints={data.weeklyPoints}
          />
        </div>
        <div className="lg:col-span-4">
          <TopSellingProducts products={data.topProducts} />
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
                View all orders
              </Link>
            </div>

            <div className="mt-4 flex flex-col divide-y divide-[#1E293B]">
              {data.recentOrders.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-mono text-xs">
                  No orders recorded yet.
                </div>
              ) : (
                data.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E293B] text-slate-400">
                        <Package size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-mono text-xs font-bold text-white hover:text-indigo-400 hover:underline"
                          >
                            {order.number}
                          </Link>
                          <span
                            className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                              statusToneMap[order.status] ?? statusToneMap.pending
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="font-sans text-[11px] text-slate-400 mt-0.5">
                          {order.email} · {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                      <div>
                        <p className="font-mono text-xs font-bold text-white">{order.totalAmount}</p>
                        <p className="font-mono text-[10px] text-slate-500">{order.createdAt}</p>
                      </div>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="rounded-lg border border-[#1E293B] bg-[#0B0F19] p-1.5 text-slate-400 hover:border-[#334155] hover:text-white"
                        aria-label={`View order ${order.number}`}
                      >
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-[#1E293B] pt-3 text-center">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <span>View full order history</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="lg:col-span-5">
          <InventoryDonut
            inStock={data.inventory.inStock}
            lowStock={data.inventory.lowStock}
            outOfStock={data.inventory.outOfStock}
          />
        </div>
      </div>
    </div>
  );
}
