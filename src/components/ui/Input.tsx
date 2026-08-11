import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, id, ...props },
  ref
) {
  const inputId = id ?? props.name;
  return (
    <label className="flex flex-col gap-1.5" htmlFor={inputId}>
      {label && <span className="text-xs font-medium text-ink-300">{label}</span>}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 transition-colors",
          "focus:border-brass-400 focus:outline-none focus:ring-2 focus:ring-brass-400/20",
          error && "border-signal-red focus:border-signal-red focus:ring-signal-red/20",
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {hint && !error && <span className="text-xs text-ink-500">{hint}</span>}
      {error && <span className="text-xs text-signal-red">{error}</span>}
    </label>
  );
});
