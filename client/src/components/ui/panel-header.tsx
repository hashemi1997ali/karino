import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Header used by every dashboard panel: icon tile, title, subtitle, optional action. */
export function PanelHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="soft-icon" aria-hidden="true">
          <Icon className="size-[1.125rem]" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[0.95rem] font-semibold tracking-[-0.01em]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Small "View all →" style link for panel headers. */
export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-link focus-ring">
      {children}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}
