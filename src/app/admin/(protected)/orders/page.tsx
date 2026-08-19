import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { Filter, Download, Plus, ChevronRight, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { formatMoney } from "@/lib/money";

interface OrdersPageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

const STATUSES: OrderStatus[] = ["pending", "paid", "fulfilled", "delivered", "cancelled", "refunded"];

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const { q, status } = await searchParams;

  const orders = await prisma.order.findMany({
    where: {
      ...(status && STATUSES.includes(status as OrderStatus) ? { status: status as OrderStatus } : {}),
      ...(q
        ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: true },
  });

  return (
    <div className="flex flex-col gap-6 text-slate-100">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Orders
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-400">
            {orders.length} total orders recorded
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#1E293B] bg-[#111827] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-[#182235] hover:text-white transition-colors"
          >
            <Filter size={13} />
            <span>Filter</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#1E293B] bg-[#111827] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-[#182235] hover:text-white transition-colors"
          >
            <Download size={13} />
            <span>Export</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-indigo-500 transition-colors"
          >
            <Plus size={14} />
            <span>Create order</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filter Bar */}
      <form className="flex flex-wrap items-center gap-3" method="GET">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search order number or email..."
            className="w-full rounded-xl border border-[#1E293B] bg-[#111827] py-2 pl-9 pr-3.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-xl border border-[#1E293B] bg-[#111827] px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.toUpperCase()}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-[#1E293B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#334155] transition-colors"
        >
          Apply
        </button>
        {(q || status) && (
          <Link href="/admin/orders" className="font-mono text-xs text-slate-400 hover:text-indigo-400">
            Clear
          </Link>
        )}
      </form>

      {/* Orders Data Table */}
      <div className="overflow-hidden rounded-2xl border border-[#1E293B] bg-[#111827] shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-[#1E293B] font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#0B0F19]/40">
                <th className="py-3.5 px-6">Order</th>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Total</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No orders match your filter criteria.
                  </td>
                </tr>
              )}
              {orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-[#182235]">
                  <td className="py-4 px-6 font-mono font-bold text-indigo-400">
                    <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                      #{order.number}
                    </Link>
                  </td>
                  <td className="py-4 px-6 text-slate-300">{order.email}</td>
                  <td className="py-4 px-6 font-mono font-bold text-white">
                    {formatMoney({ amount: order.totalAmount, currency: order.currency })}
                  </td>
                  <td className="py-4 px-6">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="py-4 px-6 font-mono text-[11px] text-slate-400">
                    {order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
                    >
                      <ChevronRight size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

