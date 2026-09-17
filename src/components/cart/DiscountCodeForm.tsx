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
      <label className="font-sans text-xs font-semibold text-gray-700 dark:text-gray-300">Discount code</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            className="w-full rounded-xl border border-gray-200 dark:border-ink-700 bg-gray-50/70 dark:bg-ink-800 py-2.5 pl-9 pr-3 font-mono text-xs uppercase text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:normal-case focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-ink-800 focus:outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading" || !code.trim()}
          className="rounded-xl border border-gray-300 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 text-xs font-semibold text-gray-800 dark:text-gray-100 transition-colors hover:bg-gray-50 dark:hover:bg-ink-700 active:bg-gray-100 dark:active:bg-ink-600 disabled:opacity-40 cursor-pointer"
        >
          {status === "loading" ? "…" : "Apply"}
        </button>
      </div>
      <AnimatePresence>
        {message && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-rose-600"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}

