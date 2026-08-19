import Link from "next/link";
import type { Metadata } from "next";
import { HelpCircle, Users, Package, Search, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { requireRole } from "@/lib/rbac";

export const metadata: Metadata = { title: "Support Dashboard · VAULT Ops" };

export default async function SupportDashboardPage() {
  // Server-side RBAC Guard: Requires SUPPORT or ADMIN
  const { session, role } = await requireRole(["SUPPORT", "ADMIN"], {
    redirectTo: "/support",
  });

  const [recentOrders, totalCustomersCount] = await Promise.all([
    prisma.order.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      include: { items: true, user: true },
    }),
    prisma.user.count({
      where: { staffRole: null },
    }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-10 font-sans">
      <div className="mx-auto max-w-6xl">
        {/* Top bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
                <HelpCircle size={18} />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Customer Support Portal
                </h1>
                <p className="text-xs text-zinc-400">
                  Signed in as <span className="font-mono text-zinc-300">{session.user.email}</span> ({role})
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Store</span>
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Registered Customers</span>
              <Users size={16} className="text-amber-400" />
            </div>
            <p className="mt-3 text-2xl font-bold font-mono text-white">{totalCustomersCount}</p>
            <p className="mt-1 text-[11px] text-zinc-500">Active accounts</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Recent Orders</span>
              <Package size={16} className="text-blue-400" />
            </div>
            <p className="mt-3 text-2xl font-bold font-mono text-white">{recentOrders.length}</p>
            <p className="mt-1 text-[11px] text-zinc-500">Live order queue</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Customer Lookup</span>
              <Search size={16} className="text-emerald-400" />
            </div>
            <p className="mt-3 text-sm font-semibold text-zinc-200">Email / Order search</p>
            <p className="mt-1 text-[11px] text-zinc-500">Instant lookup ready</p>
          </div>
        </div>

        {/* Customer Inquiries & Order Lookups */}
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden shadow-xs">
          <div className="border-b border-zinc-800 px-6 py-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Customer Order Lookups
            </h2>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {recentOrders.length === 0 ? (
              <p className="py-12 text-center text-xs text-zinc-500">
                No orders recorded yet.
              </p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-zinc-850/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 font-mono text-xs font-bold">
                      #{order.number.slice(-3)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-bold text-white">
                          #{order.number}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                          {order.email}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">
                        {order.items.length} items · Total:{" "}
                        <span className="font-mono text-zinc-200">
                          {formatMoney({ amount: order.totalAmount, currency: order.currency })}
                        </span>
                        {" · "}
                        Placed {order.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                        order.status === "cancelled"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : order.status === "paid" || order.status === "delivered"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-zinc-800 text-zinc-300 border-zinc-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
