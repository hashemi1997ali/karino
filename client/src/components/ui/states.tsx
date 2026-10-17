"use client";

import { AlertCircle, Inbox, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

export function LoadingState({ label }: { label?: string }) {
  const { locale } = usePreferences();
  const resolvedLabel =
    label ?? (locale === "de" ? "Daten werden geladen …" : "Loading data …");
  return (
    <div className="loading-state grid min-h-56 place-items-center" role="status">
      <div className="grid justify-items-center gap-3 text-sm text-[var(--muted)]">
        <span className="size-8 animate-spin rounded-full border-3 border-[var(--primary-soft)] border-t-[var(--primary)]" />
        {resolvedLabel}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-56 place-items-center rounded-[var(--container-radius)] border border-dashed bg-[color-mix(in_srgb,var(--surface)_75%,transparent)] p-8 text-center",
        className,
      )}
    >
      <div className="grid max-w-sm justify-items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Icon className="size-6" />
        </span>
        <h3 className="font-bold text-[var(--foreground)]">{title}</h3>
        {description && (
          <p className="text-sm leading-6 text-[var(--muted)]">{description}</p>
        )}
        {action}
      </div>
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  const { locale } = usePreferences();
  return (
    <div className="grid min-h-48 place-items-center rounded-[var(--container-radius)] border border-rose-100 bg-rose-50/60 p-6 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
      <div className="grid justify-items-center gap-3">
        <AlertCircle className="size-7 text-rose-600 dark:text-rose-300" />
        <p className="text-sm text-rose-800 dark:text-rose-200">{message}</p>
        {retry && (
          <Button variant="secondary" size="sm" onClick={retry}>
            {locale === "de" ? "Erneut versuchen" : "Try again"}
          </Button>
        )}
      </div>
    </div>
  );
}
