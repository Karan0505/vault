"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface OrderLiveTrackerProps {
  orderId: string;
  initialStatus: string;
}

const TERMINAL_STATUSES = new Set(["fulfilled", "delivered", "cancelled", "refunded"]);

export function OrderLiveTracker({ orderId, initialStatus }: OrderLiveTrackerProps) {
  const router = useRouter();
  const currentStatusRef = useRef(initialStatus);
  currentStatusRef.current = initialStatus;

  useEffect(() => {
    // If order is already in a completed/terminal state, no need to poll
    if (TERMINAL_STATUSES.has(initialStatus)) {
      return;
    }

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          cache: "no-store",
        });
        if (!res.ok || !isMounted) return;

        const data = await res.json();
        if (data && data.status && data.status !== currentStatusRef.current) {
          currentStatusRef.current = data.status;
          router.refresh();
          if (TERMINAL_STATUSES.has(data.status)) {
            clearInterval(interval);
          }
        }
      } catch {
        // Safe silent catch on network errors
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderId, initialStatus, router]);

  return null;
}
