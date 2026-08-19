import Link from "next/link";
import type { Metadata } from "next";
import { Truck, Package, Clock, CheckCircle, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { requireRole } from "@/lib/rbac";

export const metadata: Metadata = { title: "Fulfilment Dashboard · VAULT Ops" };

export default async function FulfilmentDashboardPage() {
  // Server-side RBAC Guard: Requires FULFILMENT or ADMIN
  const { session, role } = await requireRole(["FULFILMENT", "ADMIN"], {
    redirectTo: "/fulfilment",
  });

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["paid", "pending", "fulfilled"] },
    },
    take: 15,
    orderBy: { createdAt: "desc" },
    include: { items: true, fulfillments: true },
  });

  const pendingCount = orders.filter((o) => o.status === "paid" && o.fulfillments.length === 0).length;
  const fulfilledCount = orders.filter((o) => o.fulfillments.length > 0 || o.status === "fulfilled").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10 font-sans">
      <div className="mx-auto max-w-6xl">
        {/* Top bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Truck size={18} />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Fulfilment Portal
                </h1>
                <p className="text-xs text-slate-400">
                  Signed in as <span className="font-mono text-slate-300">{session.user.email}</span> ({role})
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Store</span>
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Orders to Pack</span>
              <Clock size={16} className="text-amber-400" />
            </div>
            <p className="mt-3 text-2xl font-bold font-mono text-white">{pendingCount}</p>
            <p className="mt-1 text-[11px] text-slate-500">Paid orders awaiting dispatch</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Dispatched</span>
              <CheckCircle size={16} className="text-emerald-400" />
            </div>
            <p className="mt-3 text-2xl font-bold font-mono text-white">{fulfilledCount}</p>
            <p className="mt-1 text-[11px] text-slate-500">Tracking assigned</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total in Pipeline</span>
              <Package size={16} className="text-blue-400" />
            </div>
            <p className="mt-3 text-2xl font-bold font-mono text-white">{orders.length}</p>
            <p className="mt-1 text-[11px] text-slate-500">Active fulfilment queue</p>
          </div>
        </div>

        {/* Packing Queue Table */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xs">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Packing Queue & Shipments
            </h2>
          </div>

          <div className="divide-y divide-slate-800/80">
            {orders.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-500">
                No orders currently in the pipeline.
              </p>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-slate-850/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-bold">
                      #{order.number.slice(-3)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-bold text-white">
                          #{order.number}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {order.email}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {order.items.length} {order.items.length === 1 ? "item" : "items"} · Total:{" "}
                        <span className="font-mono text-slate-200">
                          {formatMoney({ amount: order.totalAmount, currency: order.currency })}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                        order.status === "paid"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : order.status === "fulfilled"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {order.status}
                    </span>

                    {order.fulfillments.length > 0 ? (
                      <span className="rounded-lg bg-slate-800/80 px-2.5 py-1 text-[11px] font-mono text-blue-300">
                        Track: {order.fulfillments[0]?.trackingNumber}
                      </span>
                    ) : (
                      <span className="rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 text-[11px] font-medium">
                        Ready to Pack
                      </span>
                    )}
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
