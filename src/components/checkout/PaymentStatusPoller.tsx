"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { notifyCartUpdated } from "@/lib/cart-events";

interface PaymentStatusPollerProps {
  orderId: string;
  initialStatus: string;
}

export function PaymentStatusPoller({ orderId, initialStatus }: PaymentStatusPollerProps) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (initialStatus !== "pending") return;

    let attempts = 0;
    const maxAttempts = 20; // 20 attempts * 3s = 60s max lifetime

    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.status && data.status !== "pending") {
            clearInterval(interval);
            if (data.status === "paid") {
              notifyCartUpdated();
            }
            router.refresh();
            return;
          }
        }
      } catch (e) {
        // Silently ignore transient network fetch failures during polling
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setTimedOut(true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, initialStatus, router]);

  if (timedOut) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-xs text-amber-200">
        Payment confirmation is taking longer than expected. Please check your order status again shortly.
      </div>
    );
  }

  return null;
}
