import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/shared/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "outline" | "admin";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 active:bg-neutral-900 dark:active:bg-neutral-300 shadow-sm",
  dark: "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 active:bg-neutral-900 dark:active:bg-neutral-300 shadow-sm",
  secondary: "bg-neutral-100 dark:bg-ink-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-ink-700 border border-neutral-200 dark:border-ink-700",
  outline: "bg-white dark:bg-ink-900 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-ink-800 border border-neutral-300 dark:border-ink-700",
  ghost: "bg-transparent text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-ink-800 hover:text-neutral-900 dark:hover:text-white",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
  admin: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-3.5 py-1.5 gap-1.5 font-medium",
  md: "text-sm px-5 py-2.5 gap-2 font-medium",
  lg: "text-base px-7 py-3.5 gap-2.5 font-medium",
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
