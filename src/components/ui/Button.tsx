import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brass-400 text-ink-950 hover:bg-brass-300 active:bg-brass-500 shadow-panel",
  secondary:
    "bg-ink-800 text-ink-100 hover:bg-ink-700 border border-ink-600",
  ghost: "bg-transparent text-ink-200 hover:bg-ink-800/60",
  danger: "bg-signal-red/90 text-ink-50 hover:bg-signal-red",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2.5 gap-2",
  lg: "text-base px-6 py-3.5 gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium tracking-tight transition-all duration-200 ease-out disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
