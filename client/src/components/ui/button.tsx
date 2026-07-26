import { forwardRef, type ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--primary)] text-[var(--on-primary)] shadow-sm hover:bg-[var(--primary-dark)] active:opacity-90 disabled:bg-[var(--primary)]",
  secondary:
    "border border-[var(--foreground)]/25 bg-[var(--surface)] text-[var(--foreground)] shadow-sm hover:border-[var(--foreground)]/45 hover:bg-[var(--highlight-soft)] active:opacity-90",
  ghost:
    "shadow-none text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
  danger:
    "border border-rose-200 bg-rose-50 text-rose-700 shadow-sm hover:border-rose-300 hover:bg-rose-100 active:opacity-90 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-11 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "size-11 overflow-hidden p-0",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    "focus-ring inline-flex items-center justify-center gap-2 rounded-full font-bold transition-[box-shadow,background-color,border-color,color,opacity] duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonClassName({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <LoaderCircle
          aria-hidden="true"
          className="size-[1.125rem] shrink-0 animate-spin text-current motion-reduce:animate-none"
          strokeWidth={2.5}
        />
      )}
      <span className={cn("contents", loading && "[&>svg]:hidden")}>{children}</span>
    </button>
  );
});
