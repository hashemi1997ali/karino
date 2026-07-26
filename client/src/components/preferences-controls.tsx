"use client";

import { Languages, Laptop, Moon, Settings2, Sun } from "lucide-react";

import { usePreferences } from "@/providers/preferences-provider";
import { cn } from "@/lib/utils";

const copy = {
  en: {
    open: "Open language and appearance settings",
    title: "Preferences",
    language: "Language",
    appearance: "Appearance",
    english: "English",
    german: "Deutsch",
    light: "Light",
    dark: "Dark",
    system: "System",
  },
  de: {
    open: "Sprach- und Darstellungseinstellungen öffnen",
    title: "Einstellungen",
    language: "Sprache",
    appearance: "Darstellung",
    english: "English",
    german: "Deutsch",
    light: "Hell",
    dark: "Dunkel",
    system: "System",
  },
} as const;

export function PreferencesControls({
  className,
  placement = "default",
}: {
  className?: string;
  placement?: "default" | "sidebar";
}) {
  const { locale, theme, setLocale, setTheme } = usePreferences();
  const t = copy[locale];
  const themeOptions = [
    { value: "light" as const, label: t.light, icon: Sun },
    { value: "dark" as const, label: t.dark, icon: Moon },
    { value: "system" as const, label: t.system, icon: Laptop },
  ];

  return (
    <details className={cn("group relative", className)}>
      <summary
        className="focus-ring grid size-10 list-none place-items-center rounded-full border bg-[var(--surface)] text-[var(--muted)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] [&::-webkit-details-marker]:hidden"
        aria-label={t.open}
        title={t.title}
      >
        <Settings2 className="size-4.5" />
      </summary>
      <div
        className={cn(
          "surface-shadow z-[70] rounded-[var(--container-radius)] border bg-[var(--surface)] p-3 text-[var(--foreground)]",
          placement === "sidebar"
            ? "fixed inset-x-3 top-18 w-auto sm:right-auto sm:w-72"
            : "fixed inset-x-3 top-22 w-auto sm:absolute sm:inset-x-auto sm:end-0 sm:top-12 sm:w-72",
        )}
      >
        <div className="flex items-center gap-2 px-1 pb-2 text-sm font-bold">
          <Languages className="size-4 text-[var(--primary)]" />
          {t.language}
        </div>
        <div
          className="grid grid-cols-2 gap-1 rounded-2xl bg-[var(--surface-muted)] p-1"
          role="group"
          aria-label={t.language}
        >
          {(
            [
              ["en", t.english],
              ["de", t.german],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setLocale(value)}
              className={cn(
                "focus-ring flex h-10 items-center justify-center rounded-xl px-3 text-sm font-bold transition",
                locale === value
                  ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
              aria-pressed={locale === value}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 px-1 pb-2 text-sm font-bold">{t.appearance}</div>
        <div
          className="grid grid-cols-3 gap-1 rounded-2xl bg-[var(--surface-muted)] p-1"
          role="group"
          aria-label={t.appearance}
        >
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "focus-ring grid min-h-14 place-items-center gap-1 rounded-xl px-2 py-2 text-xs font-bold transition",
                theme === value
                  ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
              aria-pressed={theme === value}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
