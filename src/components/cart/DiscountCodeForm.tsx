"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag } from "lucide-react";

interface DiscountPreview {
  eligible: boolean;
  reason?: string;
  totalDiscount?: number;
  freeShipping?: boolean;
}

const REASON_LABEL: Record<string, string> = {
  inactive: "That code isn't active.",
  not_started: "That code isn't live yet.",
  expired: "That code has expired.",
  below_minimum_spend: "Your cart doesn't meet this code's minimum spend.",
};

export function DiscountCodeForm({ onApplied }: { onApplied: (code: string, preview: DiscountPreview) => void }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/cart/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(typeof body.error === "string" ? body.error : "Couldn't apply that code.");
        setStatus("error");
        return;
      }

      const preview: DiscountPreview = await res.json();
      if (!preview.eligible) {
        setMessage((preview.reason && REASON_LABEL[preview.reason]) || "That code doesn't apply to your cart.");
        setStatus("error");
        return;
      }

      setStatus("idle");
      setMessage(null);
      onApplied(code.trim(), preview);
    } catch {
      setStatus("error");
      setMessage("Something went wrong — try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Discount code"
            className="w-full rounded-lg border border-ink-600 bg-ink-900 py-2.5 pl-9 pr-3 font-mono text-sm uppercase text-ink-50 placeholder:text-ink-500 placeholder:normal-case focus:border-brass-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg border border-ink-600 px-4 text-sm text-ink-200 transition-colors hover:border-brass-400 hover:text-brass-300 disabled:opacity-50"
        >
          {status === "loading" ? "Checking…" : "Apply"}
        </button>
      </div>
      <AnimatePresence>
        {message && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-signal-red"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}
