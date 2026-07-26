import { Check } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <Link href="/" className="focus-ring inline-flex items-center gap-2.5 rounded-xl">
      <span className="relative grid size-10 rotate-[-3deg] place-items-center rounded-[0.9rem] bg-[var(--primary)] text-[var(--on-primary)] shadow-sm">
        <Check className="size-5" strokeWidth={3} />
        <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[var(--surface)] bg-[var(--highlight)]" />
      </span>
      {!compact && (
        <span
          className={cn(
            "text-xl font-black tracking-[-0.04em]",
            inverse ? "text-white" : "text-[var(--foreground)]",
          )}
        >
          Karino
        </span>
      )}
    </Link>
  );
}
