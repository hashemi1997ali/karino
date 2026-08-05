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
    "border border-transparent bg-[linear-gradient(135deg,var(--primary),color-mix(in_srgb,var(--primary)_72%,var(--highlight)))] text-[var(--on-primary)] shadow-[0_10px_24px_var(--primary-glow)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_var(--primary-glow)] active:translate-y-0 disabled:translate-y-0 disabled:bg-[var(--primary)]",
  secondary:
    "border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] text-[var(--foreground)] shadow-[0_5px_16px_rgb(30_35_64_/_0.05)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:bg-[var(--surface)] active:translate-y-0 active:bg-[var(--primary-soft)]",
  ghost:
    "border border-transparent shadow-none text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
  danger:
    "border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 active:bg-rose-100 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-3.5 text-sm",
  md: "h-11 px-4.5 text-sm",
  lg: "h-12 px-6 text-[0.95rem]",
  icon: "size-10 overflow-hidden p-0",
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
    "focus-ring inline-flex items-center justify-center gap-2 rounded-[var(--control-radius)] font-bold tracking-[-0.01em] transition-[background-color,border-color,color,opacity,transform,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50",
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
