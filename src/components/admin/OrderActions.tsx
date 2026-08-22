"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export interface ActionOrderItem {
  id: string;
  titleSnapshot: string;
  quantity: number;
  fulfilledQuantity: number;
  refundedQuantity: number;
}

interface OrderActionsProps {
  orderId: string;
  status: string;
  items: ActionOrderItem[];
  canFulfil: boolean;
  canCancel: boolean;
  canRefund: boolean;
}

export function OrderActions({ orderId, status, items, canFulfil, canCancel, canRefund }: OrderActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Fulfil form state
  const unfulfilledItems = items.filter((i) => i.fulfilledQuantity < i.quantity);
  const [fulfilQuantities, setFulfilQuantities] = useState<Record<string, number>>(
    Object.fromEntries(unfulfilledItems.map((i) => [i.id, i.quantity - i.fulfilledQuantity]))
  );
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");

  // Refund form state
  const refundableItems = items.filter((i) => i.refundedQuantity < i.quantity);
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState(true);
  const [refundReason, setRefundReason] = useState("");

  const [cancelReason, setCancelReason] = useState("");

  function submitFulfil(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const requestItems = unfulfilledItems
      .map((item) => ({ orderItemId: item.id, quantity: fulfilQuantities[item.id] ?? 0 }))
      .filter((i) => i.quantity > 0);
    if (requestItems.length === 0 || !trackingNumber) {
      setError("Enter a tracking number and at least one item quantity.");
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${orderId}/fulfil`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber, carrier: carrier || undefined, items: requestItems }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Could not fulfil this order.");
        return;
      }
      router.refresh();
    });
  }

  function submitCancel() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Could not cancel this order.");
        return;
      }
      router.refresh();
    });
  }

  function submitRefund(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const requestItems = refundableItems
      .map((item) => ({ orderItemId: item.id, quantity: refundQuantities[item.id] ?? 0 }))
      .filter((i) => i.quantity > 0);
    if (requestItems.length === 0) {
      setError("Choose at least one item and quantity to refund.");
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "itemized",
          items: requestItems,
          reason: refundReason || undefined,
          restock,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Could not refund this order.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="rounded-lg border border-signal-red/40 bg-signal-red/10 px-4 py-3 text-sm text-signal-red">{error}</p>}

      {canFulfil && status === "paid" && unfulfilledItems.length > 0 && (
        <form onSubmit={submitFulfil} className="flex flex-col gap-4 rounded-xl border border-ink-700 p-5">
          <p className="eyebrow">Fulfil</p>
          {unfulfilledItems.map((item) => {
            const remaining = item.quantity - item.fulfilledQuantity;
            return (
              <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-ink-300">
                  {item.titleSnapshot} ({remaining} remaining)
                </span>
                <input
                  type="number"
                  min={0}
                  max={remaining}
                  value={fulfilQuantities[item.id] ?? 0}
                  onChange={(e) =>
                    setFulfilQuantities((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))
                  }
                  className="w-20 rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-100"
                />
              </div>
            );
          })}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Tracking number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} required />
            <Input label="Carrier (optional)" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Fulfilling…" : "Mark fulfilled"}
          </Button>
        </form>
      )}

      {canCancel && status === "pending" && (
        <div className="flex flex-col gap-3 rounded-xl border border-ink-700 p-5">
          <p className="eyebrow">Cancel</p>
          <Textarea label="Reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} />
          <Button type="button" variant="danger" onClick={submitCancel} disabled={isPending}>
            {isPending ? "Cancelling…" : "Cancel order"}
          </Button>
        </div>
      )}

      {canRefund && ["paid", "fulfilled", "delivered"].includes(status) && refundableItems.length > 0 && (
        <form onSubmit={submitRefund} className="flex flex-col gap-4 rounded-xl border border-ink-700 p-5">
          <p className="eyebrow">Refund</p>
          {refundableItems.map((item) => {
            const remaining = item.quantity - item.refundedQuantity;
            return (
              <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-ink-300">
                  {item.titleSnapshot} ({remaining} refundable)
                </span>
                <input
                  type="number"
                  min={0}
                  max={remaining}
                  value={refundQuantities[item.id] ?? 0}
                  onChange={(e) => setRefundQuantities((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                  className="w-20 rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-100"
                />
              </div>
            );
          })}
          <label className="flex items-center gap-2 text-sm text-ink-300">
            <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
            Restock these items
          </label>
          <Textarea label="Reason (optional)" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={2} />
          <Button type="submit" variant="secondary" disabled={isPending}>
            {isPending ? "Refunding…" : "Issue refund"}
          </Button>
        </form>
      )}
    </div>
  );
}
