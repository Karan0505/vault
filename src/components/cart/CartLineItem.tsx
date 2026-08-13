"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/Badge";
import { notifyCartUpdated } from "@/lib/cart-events";
import type { CartLineView } from "@/lib/cart.server";

export function CartLineItem({ line, onChanged }: { line: CartLineView; onChanged: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [localQuantity, setLocalQuantity] = useState(line.quantity);

  function updateQuantity(next: number) {
    if (next < 0 || (next > localQuantity && next > line.onHand)) return;
    setLocalQuantity(next);
    startTransition(async () => {
      const res = await fetch(`/api/cart/${line.itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: next }),
      });
      if (!res.ok) {
        setLocalQuantity(line.quantity);
      }
      notifyCartUpdated();
      onChanged();
    });
  }

  function remove() {
    startTransition(async () => {
      await fetch(`/api/cart/${line.itemId}`, { method: "DELETE" });
      notifyCartUpdated();
      onChanged();
    });
  }

  const overStock = localQuantity > line.onHand;

  return (
    <div className="flex items-start gap-4 border-b border-ink-800 py-5 last:border-0">
      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${line.productSlug}`}
          className="font-display text-base text-ink-100 transition-colors hover:text-brass-300"
        >
          {line.productTitle}
        </Link>
        <p className="mt-1 font-mono text-xs text-ink-500">
          {Object.values(line.options).join(" / ")} · {line.sku}
        </p>
        {!line.isEnabled && (
          <Badge tone="red" className="mt-2">
            No longer available
          </Badge>
        )}
        {line.isEnabled && overStock && (
          <Badge tone="amber" className="mt-2">
            Only {line.onHand} left — reduce quantity before checkout
          </Badge>
        )}

        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center rounded-full border border-ink-600">
            <button
              type="button"
              onClick={() => updateQuantity(localQuantity - 1)}
              disabled={isPending || localQuantity <= 1}
              aria-label="Decrease quantity"
              className="p-2 text-ink-300 hover:text-brass-300 disabled:opacity-40"
            >
              <Minus size={13} />
            </button>
            <span className="w-6 text-center font-mono text-sm text-ink-100">{localQuantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(localQuantity + 1)}
              disabled={isPending || localQuantity >= line.onHand}
              aria-label="Increase quantity"
              className="p-2 text-ink-300 hover:text-brass-300 disabled:opacity-40"
            >
              <Plus size={13} />
            </button>
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="flex items-center gap-1 text-xs text-ink-500 transition-colors hover:text-signal-red"
          >
            <X size={12} /> Remove
          </button>
        </div>
      </div>

      <span className="whitespace-nowrap font-mono text-sm text-ink-200">
        {formatMoney({ amount: line.lineTotal, currency: line.currency })}
      </span>
    </div>
  );
}
