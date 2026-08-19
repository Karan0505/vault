"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const REASONS = ["received", "damaged", "lost", "returned", "correction", "other"] as const;

export function AdjustStockForm({ variantId }: { variantId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("received");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (delta === 0) {
      setError("Enter a non-zero adjustment.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/${variantId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, reason, note: note || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Could not apply adjustment.");
        return;
      }
      setOpen(false);
      setDelta(0);
      setNote("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-brass-400 hover:text-brass-300">
        Adjust
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-ink-700 bg-ink-900 p-3">
      {error && <p className="text-xs text-signal-red">{error}</p>}
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
          placeholder="+/-"
          className="w-20 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs text-ink-100"
        />
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
          className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs text-ink-100"
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs text-ink-100 placeholder:text-ink-600"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Apply"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
