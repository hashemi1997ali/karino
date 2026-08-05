import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "desk-panel transition-[background-color,border-color,box-shadow] duration-200",
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
        "inline-flex min-h-7 items-center rounded-full border border-current/10 bg-[color-mix(in_srgb,currentColor_5%,transparent)] px-2.5 py-1 text-[11px] font-bold tracking-[0.01em]",
        className,
      )}
      {...props}
    />
  );
}
