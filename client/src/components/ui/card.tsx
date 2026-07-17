import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.6rem] border bg-[var(--surface)] shadow-[0_8px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-current/10 px-2.5 py-1 text-[11px] font-extrabold tracking-wide",
        className,
      )}
      {...props}
    />
  );
}
