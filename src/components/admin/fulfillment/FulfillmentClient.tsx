"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Truck, CheckCircle2, Search, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

export interface FulfillmentOrder {
  id: string;
  number: string;
  email: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  shippingAddress: any;
  items: Array<{
    id: string;
    titleSnapshot: string;
    skuSnapshot: string;
    quantity: number;
    fulfilledQuantity: number;
    unitAmount: string;
  }>;
  fulfillments: Array<{
    id: string;
    trackingNumber: string;
    carrier: string | null;
    createdAt: string;
  }>;
}

interface FulfillmentClientProps {
  orders: FulfillmentOrder[];
  stats: {
    unfulfilledCount: number;
    inTransitCount: number;
    deliveredCount: number;
  };
}

export function FulfillmentClient({ orders, stats }: FulfillmentClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "paid" | "fulfilled" | "delivered">("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    if (filter === "paid" && order.status !== "paid") return false;
    if (filter === "fulfilled" && order.status !== "fulfilled") return false;
    if (filter === "delivered" && order.status !== "delivered") return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        order.number.toLowerCase().includes(q) ||
        order.email.toLowerCase().includes(q) ||
        order.items.some((it) => it.titleSnapshot.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleFulfillOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!trackingNumber.trim()) {
      setActionError("Tracking number is required");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const itemsToFulfill = selectedOrder.items
        .filter((it) => it.quantity > it.fulfilledQuantity)
        .map((it) => ({
          orderItemId: it.id,
          quantity: it.quantity - it.fulfilledQuantity,
        }));

      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/fulfil`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: trackingNumber.trim(),
          carrier: carrier.trim() || undefined,
          items: itemsToFulfill,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || "Failed to fulfill order");
      }

      setActionSuccess(`Order ${selectedOrder.number} fulfilled successfully!`);
      setSelectedOrder(null);
      setTrackingNumber("");
      setCarrier("");
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Fulfillment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkDelivered = async (orderId: string, orderNumber: string) => {
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/deliver`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || "Failed to mark delivered");
      }

      setActionSuccess(`Order ${orderNumber} marked as delivered!`);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delivery update failed");
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
            Fulfillment Hub
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-400">
            Order packing queue, tracking generation, and delivery verification
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-5 shadow-panel">
          <div>
            <p className="font-sans text-xs font-semibold text-slate-400">Ready to Pack (Paid)</p>
            <p className="mt-1 font-mono text-2xl font-bold text-amber-400">{stats.unfulfilledCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <Package size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-5 shadow-panel">
          <div>
            <p className="font-sans text-xs font-semibold text-slate-400">In Transit (Fulfilled)</p>
            <p className="mt-1 font-mono text-2xl font-bold text-indigo-400">{stats.inTransitCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <Truck size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#1E293B] bg-[#111827] p-5 shadow-panel">
          <div>
            <p className="font-sans text-xs font-semibold text-slate-400">Delivered Shipments</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">{stats.deliveredCount}</p>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#1E293B] bg-[#111827] p-4 shadow-panel">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 font-sans text-xs font-semibold transition-colors ${
              filter === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("paid")}
            className={`rounded-lg px-3 py-1.5 font-sans text-xs font-semibold transition-colors ${
              filter === "paid" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Ready to Pack ({stats.unfulfilledCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("fulfilled")}
            className={`rounded-lg px-3 py-1.5 font-sans text-xs font-semibold transition-colors ${
              filter === "fulfilled" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            In Transit ({stats.inTransitCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("delivered")}
            className={`rounded-lg px-3 py-1.5 font-sans text-xs font-semibold transition-colors ${
              filter === "delivered" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Delivered ({stats.deliveredCount})
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search order #, email, items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] py-1.5 pl-8 pr-3 font-sans text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-4">
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-12 text-center text-slate-400 font-mono text-xs shadow-panel">
            No orders found matching the selected filter.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isPaid = order.status === "paid";
            const isFulfilled = order.status === "fulfilled";
            const isDelivered = order.status === "delivered";

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-panel transition-all hover:border-[#334155]"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E293B] text-indigo-400">
                      <Package size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono text-sm font-bold text-white hover:text-indigo-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>{order.number}</span>
                          <ExternalLink size={12} className="text-slate-500" />
                        </Link>
                        <span
                          className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                            isPaid
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : isFulfilled
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : isDelivered
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-slate-400 mt-0.5">
                        {order.email} · Placed {order.createdAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white mr-2">{order.totalAmount}</span>
                    {isPaid && (
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="rounded-xl bg-indigo-600 px-4 py-2 font-sans text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
                      >
                        Pack & Ship
                      </button>
                    )}
                    {isFulfilled && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleMarkDelivered(order.id, order.number)}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 font-sans text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>

                {/* Items & Shipping Snapshot */}
                <div className="mt-4 grid gap-6 md:grid-cols-12">
                  <div className="md:col-span-8 flex flex-col gap-2">
                    <p className="font-sans text-xs font-semibold text-slate-400">Order Items</p>
                    <div className="flex flex-col divide-y divide-[#1E293B]/60">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 font-sans text-xs">
                          <div>
                            <span className="font-semibold text-white">{item.titleSnapshot}</span>
                            <span className="ml-2 font-mono text-[11px] text-slate-500">SKU: {item.skuSnapshot}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-slate-400">Qty: {item.quantity}</span>
                            <span className="font-mono text-indigo-300 font-bold">{item.unitAmount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-4 rounded-xl border border-[#1E293B] bg-[#0B0F19] p-3.5 font-sans text-xs text-slate-300">
                    <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-1">
                      Shipping Destination
                    </p>
                    {order.shippingAddress ? (
                      <div className="space-y-0.5">
                        <p className="font-bold text-white">{order.shippingAddress.fullName}</p>
                        <p>{order.shippingAddress.address} {order.shippingAddress.apartment}</p>
                        <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                        <p className="text-slate-400">{order.shippingAddress.country}</p>
                      </div>
                    ) : (
                      <p className="text-slate-500 italic">No address snapshot recorded</p>
                    )}

                    {order.fulfillments.length > 0 && order.fulfillments[0] && (
                      <div className="mt-3 border-t border-[#1E293B] pt-2">
                        <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                          Tracking Information
                        </p>
                        <p className="font-mono text-xs text-white mt-0.5">
                          {order.fulfillments[0].trackingNumber}
                          {order.fulfillments[0].carrier ? ` (${order.fulfillments[0].carrier})` : ""}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pack & Ship Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#1E293B] bg-[#111827] p-6 shadow-2xl">
            <h3 className="font-sans text-base font-bold text-white">
              Fulfill Order {selectedOrder.number}
            </h3>
            <p className="font-mono text-xs text-slate-400 mt-1">
              Enter tracking details to notify customer and mark items fulfilled.
            </p>

            <form onSubmit={handleFulfillOrder} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                  Carrier (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPS, FedEx, USPS, DHL, VAULT Express"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-sans text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-sans text-xs font-semibold text-slate-300 mb-1">
                  Tracking Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1Z9999999999999999"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2 font-mono text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="mt-2 flex items-center justify-end gap-3 border-t border-[#1E293B] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder(null);
                    setActionError(null);
                  }}
                  className="rounded-xl border border-[#1E293B] px-4 py-2 font-sans text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 font-sans text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Confirm Shipment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
