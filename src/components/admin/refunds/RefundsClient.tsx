"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, DollarSign, Search, Plus, ExternalLink, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export interface RefundRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  amount: string;
  rawAmount: number;
  reason: string | null;
  stripeRefundId: string | null;
  restocked: boolean;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    title: string;
  }>;
}

export interface EligibleOrder {
  id: string;
  number: string;
  email: string;
  status: string;
  totalAmount: string;
  items: Array<{
    id: string;
    titleSnapshot: string;
    quantity: number;
    refundedQuantity: number;
    unitAmount: string;
  }>;
}

interface RefundsClientProps {
  refunds: RefundRecord[];
  eligibleOrders: EligibleOrder[];
  stats: {
    totalRefunded: string;
    refundCount: number;
    restockedCount: number;
  };
}

export function RefundsClient({ refunds, eligibleOrders, stats }: RefundsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [refundKind, setRefundKind] = useState<"itemized" | "goodwill">("itemized");
  const [goodwillAmountDollars, setGoodwillAmountDollars] = useState("");
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const selectedOrder = eligibleOrders.find((o) => o.id === selectedOrderId);

  const filteredRefunds = refunds.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.orderNumber.toLowerCase().includes(q) ||
      r.customerEmail.toLowerCase().includes(q) ||
      (r.reason && r.reason.toLowerCase().includes(q)) ||
      (r.stripeRefundId && r.stripeRefundId.toLowerCase().includes(q))
    );
  });

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    const ord = eligibleOrders.find((o) => o.id === orderId);
    if (ord) {
      const initialQty: Record<string, number> = {};
      ord.items.forEach((it) => {
        const remaining = Math.max(0, it.quantity - it.refundedQuantity);
        initialQty[it.id] = remaining > 0 ? 1 : 0;
      });
      setItemQuantities(initialQty);
    }
  };

  const handleIssueRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      let payload: any;
      if (refundKind === "itemized") {
        const itemsToRefund = Object.entries(itemQuantities)
          .filter(([_, qty]) => qty > 0)
          .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

        if (itemsToRefund.length === 0) {
          throw new Error("Please specify quantity of at least one item to refund");
        }

        payload = {
          kind: "itemized",
          items: itemsToRefund,
          reason: reason.trim() || undefined,
          restock,
        };
      } else {
        const amountCents = Math.round(parseFloat(goodwillAmountDollars) * 100);
        if (isNaN(amountCents) || amountCents <= 0) {
          throw new Error("Please enter a valid goodwill refund dollar amount");
        }

        payload = {
          kind: "goodwill",
          amount: amountCents,
          reason: reason.trim() || undefined,
        };
      }

      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || "Failed to process refund");
      }

      setActionSuccess(`Refund processed successfully for order ${selectedOrder.number}!`);
      setIsModalOpen(false);
      setSelectedOrderId("");
      setReason("");
      setGoodwillAmountDollars("");
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Refunds Operations Hub
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-400">
            Authoritative refund ledger, itemized adjustments, and Stripe gateway transactions
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsModalOpen(true);
            setActionError(null);
            setActionSuccess(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-sans text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
        >
          <Plus size={16} />
          <span>Issue Refund</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-5 shadow-panel">
          <div>
            <p className="font-sans text-xs font-semibold text-slate-400">Total Refunded Volume</p>
            <p className="mt-1 font-mono text-2xl font-bold text-rose-400">{stats.totalRefunded}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-5 shadow-panel">
          <div>
            <p className="font-sans text-xs font-semibold text-slate-400">Refund Transactions</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white">{stats.refundCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E293B] text-slate-300">
            <RotateCcw size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-5 shadow-panel">
          <div>
            <p className="font-sans text-xs font-semibold text-slate-400">Restocked Line Items</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">{stats.restockedCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {actionSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 font-sans text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 font-sans text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#1E293B] bg-[#111827] p-4 shadow-panel">
        <div className="relative w-full max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by order #, customer email, refund ID, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] py-2 pl-8 pr-3 font-sans text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
          />
        </div>
        <span className="font-mono text-xs text-slate-400">
          Showing {filteredRefunds.length} {filteredRefunds.length === 1 ? "record" : "records"}
        </span>
      </div>

      {/* Refunds Table */}
      <div className="overflow-hidden rounded-2xl border border-[#1E293B] bg-[#111827] shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead className="border-b border-[#1E293B] bg-[#0B0F19]/50 font-mono text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Order</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Refunded Amount</th>
                <th className="px-6 py-3.5">Reason</th>
                <th className="px-6 py-3.5">Restocked</th>
                <th className="px-6 py-3.5">Gateway Reference</th>
                <th className="px-6 py-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-slate-300">
              {filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-mono text-xs">
                    No refund transactions recorded yet.
                  </td>
                </tr>
              ) : (
                filteredRefunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-[#1E293B]/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      <Link
                        href={`/admin/orders/${refund.orderId}`}
                        className="hover:text-indigo-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>{refund.orderNumber}</span>
                        <ExternalLink size={11} className="text-slate-500" />
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-sans text-slate-300">{refund.customerEmail}</td>
                    <td className="px-6 py-4 font-mono font-bold text-rose-400">{refund.amount}</td>
                    <td className="px-6 py-4 font-sans text-slate-400 max-w-xs truncate">
                      {refund.reason || "General customer refund"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                          refund.restocked
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        {refund.restocked ? "Restocked" : "No Restock"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                      {refund.stripeRefundId ? (
                        <span className="text-indigo-300">{refund.stripeRefundId}</span>
                      ) : (
                        <span className="text-slate-600">Manual / Test</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">{refund.createdAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Refund Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-sans text-base font-bold text-white">Issue Order Refund</h3>
            <p className="font-mono text-xs text-slate-400 mt-1">
              Authoritative refund execution directly through Stripe gateway.
            </p>

            <form onSubmit={handleIssueRefund} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                  Select Completed Order <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={selectedOrderId}
                  onChange={(e) => handleOrderChange(e.target.value)}
                  className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-sans text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="">-- Select an Order --</option>
                  {eligibleOrders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.number} — {ord.email} ({ord.totalAmount})
                    </option>
                  ))}
                </select>
              </div>

              {selectedOrder && (
                <>
                  <div className="flex items-center gap-4 border-y border-[#1E293B] py-3">
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-xs font-semibold text-slate-300">
                      <input
                        type="radio"
                        name="refundKind"
                        checked={refundKind === "itemized"}
                        onChange={() => setRefundKind("itemized")}
                        className="accent-indigo-600"
                      />
                      <span>Itemized Line-Item Refund</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-xs font-semibold text-slate-300">
                      <input
                        type="radio"
                        name="refundKind"
                        checked={refundKind === "goodwill"}
                        onChange={() => setRefundKind("goodwill")}
                        className="accent-indigo-600"
                      />
                      <span>Goodwill Amount Refund</span>
                    </label>
                  </div>

                  {refundKind === "itemized" ? (
                    <div className="flex flex-col gap-2">
                      <p className="font-sans text-xs font-semibold text-slate-400">
                        Select Item Quantities to Refund
                      </p>
                      <div className="flex flex-col divide-y divide-[#1E293B]/60 rounded-xl border border-[#1E293B] bg-[#0B0F19] p-3">
                        {selectedOrder.items.map((item) => {
                          const remaining = Math.max(0, item.quantity - item.refundedQuantity);
                          return (
                            <div key={item.id} className="flex items-center justify-between py-2 font-sans text-xs">
                              <div>
                                <p className="font-bold text-white">{item.titleSnapshot}</p>
                                <p className="text-slate-500 font-mono text-[11px]">
                                  {item.unitAmount} each · {remaining} of {item.quantity} refundable
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="font-mono text-slate-400 text-xs">Qty:</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={remaining}
                                  value={itemQuantities[item.id] ?? 0}
                                  onChange={(e) =>
                                    setItemQuantities({
                                      ...itemQuantities,
                                      [item.id]: parseInt(e.target.value, 10) || 0,
                                    })
                                  }
                                  className="w-16 rounded-lg border border-[#1E293B] bg-[#111827] px-2 py-1 font-mono text-xs text-white text-center"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <label className="flex items-center gap-2 mt-2 cursor-pointer font-sans text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={restock}
                          onChange={(e) => setRestock(e.target.checked)}
                          className="accent-indigo-600 rounded-sm"
                        />
                        <span>Automatically restock inventory for refunded items</span>
                      </label>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                        Goodwill Refund Dollar Amount ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="e.g. 15.00"
                        value={goodwillAmountDollars}
                        onChange={(e) => setGoodwillAmountDollars(e.target.value)}
                        className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-mono text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                      Refund Reason / Internal Note
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Customer returned package, sizing exchange, courtesy goodwill"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-sans text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </>
              )}

              <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#1E293B] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setActionError(null);
                  }}
                  className="rounded-xl border border-[#1E293B] px-4 py-2 font-sans text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedOrderId}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 font-sans text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Execute Refund</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
