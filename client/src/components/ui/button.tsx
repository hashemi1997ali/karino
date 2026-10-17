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
    "btn-shine border border-[color-mix(in_srgb,var(--foreground)_3%,transparent)] bg-[var(--foreground)] text-[var(--background)] shadow-[0_1px_2px_rgb(0_0_0_/_0.12)] enabled:hover:-translate-y-px enabled:hover:shadow-[0_10px_24px_-10px_rgb(0_0_0_/_0.45)] disabled:opacity-50",
  secondary:
    "border border-[color-mix(in_srgb,var(--border)_95%,transparent)] bg-[var(--surface)] text-[var(--foreground)] shadow-[0_1px_2px_rgb(0_0_0_/_0.04)] hover:border-[color-mix(in_srgb,var(--primary)_24%,var(--border))] hover:bg-[var(--surface-muted)] active:bg-[var(--surface-muted)]",
  ghost:
    "shadow-none text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
  danger:
    "border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 active:bg-rose-100 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[0.8125rem]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[0.9375rem]",
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
    "focus-ring inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,border-color,color,filter,opacity,box-shadow,transform] duration-200 enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:enabled:active:scale-100",
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
