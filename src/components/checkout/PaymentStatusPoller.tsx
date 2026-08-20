"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { notifyCartUpdated } from "@/lib/cart/cart-events";

interface PaymentStatusPollerProps {
  orderId: string;
  initialStatus: string;
}

export function PaymentStatusPoller({ orderId, initialStatus }: PaymentStatusPollerProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(initialStatus);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.status && data.status !== "pending") {
          setCurrentStatus(data.status);
          if (data.status === "paid") {
            notifyCartUpdated();
          }
          router.refresh();
          return true;
        }
      }
    } catch {
      // Silently ignore network fetch failures during polling
    } finally {
      setIsChecking(false);
    }
    return false;
  }, [orderId, router]);

  useEffect(() => {
    if (initialStatus !== "pending") return;

    let attempts = 0;
    const maxAttempts = 20; // 20 attempts * 2.5s = 50s max lifetime

    const interval = setInterval(async () => {
      attempts++;
      const isComplete = await checkStatus();
      if (isComplete || attempts >= maxAttempts) {
        clearInterval(interval);
        if (attempts >= maxAttempts && !isComplete) {
          setTimedOut(true);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [initialStatus, checkStatus]);

  if (currentStatus !== "pending") {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {timedOut ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-xs font-medium text-amber-800">
          Payment confirmation is taking longer than expected. You can check again below.
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Synchronizing with Stripe in near-real-time…</span>
        </div>
      )}

      <button
        type="button"
        disabled={isChecking}
        onClick={() => checkStatus()}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-50 hover:text-black hover:border-gray-300 disabled:opacity-50 cursor-pointer"
      >
        <RefreshCw size={13} className={isChecking ? "animate-spin text-black" : "text-gray-500"} />
        <span>{isChecking ? "Checking…" : "Check status now"}</span>
      </button>
    </div>
  );
}
