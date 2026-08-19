"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/Badge";
import { notifyCartUpdated } from "@/lib/cart-events";
import type { CartLineView } from "@/lib/cart.server";

export function CartLineItem({ line, onChanged }: { line: CartLineView; onChanged: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [localQuantity, setLocalQuantity] = useState(line.quantity);

  function updateQuantity(next: number) {
    if (next < 0) return;
    setLocalQuantity(next);
    startTransition(async () => {
      await fetch(`/api/cart/${line.itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: next }),
      });
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
    <div className="flex items-start gap-4 border-b border-gray-100 py-4.5 last:border-0">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-100 border border-gray-200/70 font-sans text-xs text-gray-500">
        📦
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/products/${line.productSlug}`}
            className="font-sans text-sm font-semibold text-gray-900 transition-colors hover:underline"
          >
            {line.productTitle}
          </Link>
          <span className="font-sans text-sm font-bold text-gray-900">
            {formatMoney({ amount: line.lineTotal, currency: line.currency })}
          </span>
        </div>

        <p className="mt-0.5 font-sans text-xs text-gray-500">
          {Object.values(line.options).join(" / ")}
        </p>

        {!line.isEnabled && (
          <Badge tone="red" className="mt-1.5">
            No longer available
          </Badge>
        )}
        {line.isEnabled && overStock && (
          <Badge tone="amber" className="mt-1.5">
            Only {line.onHand} left
          </Badge>
        )}

        <div className="mt-3 flex items-center justify-between">
          {/* Stepper */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => updateQuantity(localQuantity - 1)}
              disabled={isPending}
              aria-label="Decrease quantity"
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            >
              <Minus size={12} />
            </button>
            <span className="w-7 text-center font-mono text-xs font-semibold text-gray-900">
              {localQuantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(localQuantity + 1)}
              disabled={isPending}
              aria-label="Increase quantity"
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            >
              <Plus size={12} />
            </button>
          </div>

          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-rose-600"
          >
            <Trash2 size={13} />
            <span>Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
}

