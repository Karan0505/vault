import { forwardRef, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, id, children, ...props },
  ref
) {
  const selectId = id ?? props.name;
  return (
    <label className="flex flex-col gap-1.5" htmlFor={selectId}>
      {label && <span className="text-xs font-medium text-ink-300">{label}</span>}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          "rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-ink-50 transition-colors",
          "focus:border-brass-400 focus:outline-none focus:ring-2 focus:ring-brass-400/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, id, ...props },
  ref
) {
  const areaId = id ?? props.name;
  return (
    <label className="flex flex-col gap-1.5" htmlFor={areaId}>
      {label && <span className="text-xs font-medium text-ink-300">{label}</span>}
      <textarea
        ref={ref}
        id={areaId}
        className={cn(
          "rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 transition-colors",
          "focus:border-brass-400 focus:outline-none focus:ring-2 focus:ring-brass-400/20",
          className
        )}
        {...props}
      />
    </label>
  );
});

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-ink-700 bg-ink-900/60 p-6 shadow-panel", className)}>
      {children}
    </div>
  );
}
