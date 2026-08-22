"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface ReadyToPackButtonProps {
  orderId: string;
  orderNumber: string;
}

export function ReadyToPackButton({ orderId, orderNumber }: ReadyToPackButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const suffix = orderNumber.replace(/^VAULT-/, "");
        const trackingNumber = `VAULT-TRK-${suffix}`;

        const res = await fetch(`/api/admin/orders/${orderId}/fulfil`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackingNumber,
            carrier: "VAULT Express",
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const errorText = typeof data.error === "string" ? data.error : "Failed to pack order";
          setErrorMessage(errorText);
          return;
        }

        router.refresh();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Network error while fulfilling order");
      }
    });
  };

  return (
    <div className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handlePack}
        disabled={isPending}
        title={`Fulfil and dispatch order #${orderNumber}`}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 text-[11px] font-medium hover:bg-blue-600/30 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {isPending ? (
          <>
            <Loader2 size={12} className="animate-spin text-blue-300" />
            <span>Packing…</span>
          </>
        ) : (
          <span>Ready to Pack</span>
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
