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
        "grid grid-cols-3 gap-1.5 rounded-[1rem] border bg-[var(--surface-muted)] p-1.5",
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
              "focus-ring flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-[0.7rem] px-2 text-xs font-bold transition-[background-color,color,box-shadow,transform] duration-200",
              selected
                ? "bg-[var(--surface)] text-[var(--primary)] shadow-[0_6px_16px_rgb(30_35_65_/_0.08)]"
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
