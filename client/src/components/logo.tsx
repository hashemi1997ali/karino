import { MessageSquareText, Sparkles } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-visible rounded-[0.9rem] bg-[linear-gradient(145deg,var(--primary),color-mix(in_srgb,var(--primary)_62%,var(--highlight)))] text-[var(--on-primary)] shadow-[0_10px_24px_var(--primary-glow)]",
        className,
      )}
    >
      <MessageSquareText className="size-5" strokeWidth={2.25} />
      <span
        className="logo-beacon absolute -right-1 -top-1 grid size-3.5 place-items-center rounded-full border-2 border-[var(--surface)] bg-[var(--highlight)] text-white"
        aria-hidden="true"
      >
        <Sparkles className="size-1.5" strokeWidth={3} />
      </span>
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
        "overflow-hidden whitespace-nowrap text-[1.18rem] font-black tracking-[-0.055em]",
        inverse ? "text-white" : "text-[var(--foreground)]",
        className,
      )}
    >
      <span>Karino</span>
      <span
        className={cn(
          "ml-1.5 text-[0.58em] font-extrabold uppercase tracking-[0.18em]",
          inverse ? "text-white/70" : "text-[var(--primary)]",
        )}
      >
        Desk
      </span>
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
                  : "max-w-32 opacity-100 delay-100 motion-reduce:delay-0",
              ),
        )}
      />
    </Link>
  );
}
