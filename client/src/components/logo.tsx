import { Check } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-10 shrink-0 rotate-[-3deg] place-items-center rounded-[0.9rem] bg-[var(--primary)] text-[var(--on-primary)] shadow-sm",
        className,
      )}
    >
      <Check className="size-5" strokeWidth={3} />
      <span
        className="logo-beacon absolute -right-1 -top-1 size-3 rounded-full border-2 border-[var(--surface)] bg-[var(--highlight)]"
        aria-hidden="true"
      />
    </span>
  );
}

export function LogoWordmark({
  inverse = false,
  className,
}: {
  inverse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "overflow-hidden whitespace-nowrap text-xl font-black tracking-[-0.04em]",
        inverse ? "text-white" : "text-[var(--foreground)]",
        className,
      )}
    >
      Karino
    </span>
  );
}

export function Logo({
  compact = false,
  inverse = false,
  stableLabel = false,
}: {
  compact?: boolean;
  inverse?: boolean;
  stableLabel?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "focus-ring inline-flex items-center rounded-xl",
        stableLabel || !compact ? "gap-2.5" : "gap-0",
      )}
    >
      <LogoMark />
      <LogoWordmark
        inverse={inverse}
        className={cn(
          "duration-150 motion-reduce:transition-none",
          stableLabel
            ? cn(
                "shrink-0 transition-opacity",
                compact
                  ? "pointer-events-none opacity-0"
                  : "opacity-100 delay-100 motion-reduce:delay-0",
              )
            : cn(
                "transition-[max-width,opacity]",
                compact
                  ? "max-w-0 opacity-0"
                  : "max-w-24 opacity-100 delay-100 motion-reduce:delay-0",
              ),
        )}
      />
    </Link>
  );
}
