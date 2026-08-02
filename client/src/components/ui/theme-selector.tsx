import { Laptop, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

export type ThemePreference = "light" | "dark" | "system";

export function ThemeSelector({
  value,
  onValueChange,
  labels,
  ariaLabel,
  className,
}: {
  value: ThemePreference;
  onValueChange: (value: ThemePreference) => void;
  labels: Record<ThemePreference, string>;
  ariaLabel: string;
  className?: string;
}) {
  const options = [
    { value: "light" as const, icon: Sun },
    { value: "dark" as const, icon: Moon },
    { value: "system" as const, icon: Laptop },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-1 rounded-[var(--control-radius)] border bg-[var(--surface-muted)] p-1",
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map(({ value: option, icon: Icon }) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onValueChange(option)}
            aria-pressed={selected}
            className={cn(
              "focus-ring flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-[calc(var(--control-radius)-0.2rem)] px-2 text-xs font-semibold transition-colors duration-200",
              selected
                ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--surface)]/60 hover:text-[var(--foreground)]",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{labels[option]}</span>
          </button>
        );
      })}
    </div>
  );
}
