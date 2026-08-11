import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "green" | "red" | "amber" | "brass";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink-800 text-ink-300 border-ink-600",
  green: "bg-signal-green/10 text-signal-green border-signal-green/30",
  red: "bg-signal-red/10 text-signal-red border-signal-red/30",
  amber: "bg-signal-amber/10 text-signal-amber border-signal-amber/30",
  brass: "bg-brass-400/10 text-brass-300 border-brass-400/30",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
