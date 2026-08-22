"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, RotateCcw, XCircle, Loader2, Truck } from "lucide-react";

interface OrderActionsProps {
  orderId: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string | null;
  failureReason?: string | null;
  refundInitiatedAt?: Date | string | null;
  hasRefunds?: boolean;
}

export function OrderActions({
  orderId,
  orderNumber,
  status,
  trackingNumber,
  failureReason,
  refundInitiatedAt,
  hasRefunds,
}: OrderActionsProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canCancel = currentStatus === "pending" || currentStatus === "paid";
  const isShipped = currentStatus === "fulfilled";
  const canReturn = currentStatus === "delivered";
  const isFailed = currentStatus === "failed";

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel order");
      }

      setCurrentStatus("cancelled");
      setShowCancelModal(false);
      setSuccessMessage("Order cancelled successfully. If paid, your refund has been processed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process return request");
      }

      setCurrentStatus("refunded");
      setShowReturnModal(false);
      setSuccessMessage("Return processed successfully. Your refund and restock have been recorded.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process return request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800 animate-fade-in">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-800 animate-fade-in">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Failed Order Banner */}
      {isFailed && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/60 p-4 text-xs text-rose-900 shadow-xs">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600/10 text-rose-700 shrink-0">
            <XCircle size={16} />
          </span>
          <div className="flex-1">
            <span className="font-bold">Order processing failed</span>
            <p className="text-[11px] text-rose-800/80 mt-0.5">
              {failureReason ? `${failureReason}. ` : "A transaction or fulfillment error occurred. "}
              {hasRefunds || refundInitiatedAt
                ? "A refund has been initiated to your original payment method."
                : "No funds were captured from your payment method, and reserved inventory has been released."}
            </p>
          </div>
        </div>
      )}

      {/* Cancellation Allowed State */}
      {canCancel && (
        <div className="flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <div>
            <h4 className="text-xs font-bold text-gray-900">Need to change your mind?</h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              You can cancel your order anytime before it is shipped by our warehouse.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowCancelModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-colors cursor-pointer shrink-0"
          >
            <XCircle size={14} />
            <span>Cancel Order</span>
          </button>
        </div>
      )}

      {/* Shipped / Fulfilled Protection Notice */}
      {isShipped && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 text-xs text-blue-900 shadow-xs">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/10 text-blue-700 shrink-0">
            <Truck size={16} />
          </span>
          <div className="flex-1">
            <span className="font-bold">Order is in transit</span>
            <p className="text-[11px] text-blue-800/80 mt-0.5">
              {trackingNumber ? `Carrier tracking: ${trackingNumber}. ` : ""}
              Cancellation is no longer available because this order has already shipped. You may request a return once it is delivered.
            </p>
          </div>
        </div>
      )}

      {/* Delivered Return Action */}
      {canReturn && (
        <div className="flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <div>
            <h4 className="text-xs font-bold text-gray-900">Return or Exchange</h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Item delivered. If you are not completely satisfied, you can request a return.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowReturnModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <RotateCcw size={14} />
            <span>Request Return</span>
          </button>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <XCircle size={20} />
              </div>
              <div>
                <h3 className="font-sans text-base font-bold text-gray-900">Cancel Order #{orderNumber}</h3>
                <p className="text-xs text-gray-500">Are you sure you want to cancel this order?</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cancel-reason" className="text-xs font-semibold text-gray-700">
                Reason for cancellation (optional)
              </label>
              <textarea
                id="cancel-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Ordered by mistake, changed delivery address..."
                className="w-full rounded-2xl border border-gray-200 p-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
              />
            </div>

            <p className="text-[11px] text-gray-500">
              If your payment has already been processed, an automatic full refund will be issued to your original payment method.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={loading}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Order Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-800">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="font-sans text-base font-bold text-gray-900">Request Return for #{orderNumber}</h3>
                <p className="text-xs text-gray-500">Submit a return request for this delivered order</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="return-reason" className="text-xs font-semibold text-gray-700">
                Reason for return
              </label>
              <textarea
                id="return-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Size didn't fit, defective item, not as described..."
                className="w-full rounded-2xl border border-gray-200 p-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
              />
            </div>

            <p className="text-[11px] text-gray-500">
              Upon submitting, your return will be approved and a refund will be issued to your payment method according to our return policy.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                disabled={loading}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturn}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>Submit Return Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
