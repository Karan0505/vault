"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface MarkDeliveredButtonProps {
  orderId: string;
  orderNumber: string;
}

export function MarkDeliveredButton({ orderId, orderNumber }: MarkDeliveredButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDeliver = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}/deliver`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const errorText = typeof data.error === "string" ? data.error : "Failed to mark order as delivered";
          setErrorMessage(errorText);
          return;
        }

        router.refresh();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Network error while marking order delivered");
      }
    });
  };

  return (
    <div className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleDeliver}
        disabled={isPending}
        title={`Confirm delivery for order #${orderNumber}`}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-medium hover:bg-emerald-600/30 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {isPending ? (
          <>
            <Loader2 size={12} className="animate-spin text-emerald-300" />
            <span>Delivering…</span>
          </>
        ) : (
          <span>Mark Delivered</span>
        )}
      </button>
      {errorMessage && (
        <span className="absolute top-full mt-1 right-0 z-20 whitespace-nowrap rounded-md bg-rose-950/90 border border-rose-500/30 px-2 py-0.5 text-[10px] text-rose-300 shadow-md">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
