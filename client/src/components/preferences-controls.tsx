"use client";

import { Globe, Languages, Palette } from "lucide-react";
import { useId } from "react";

import { AnchoredPopover } from "@/components/ui/anchored-popover";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { usePreferences } from "@/providers/preferences-provider";
import { cn } from "@/lib/utils";

const copy = {
  en: {
    open: "Language and appearance",
    language: "Language",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    system: "System",
  },
  de: {
    open: "Sprache und Darstellung",
    language: "Sprache",
    appearance: "Darstellung",
    light: "Hell",
    dark: "Dunkel",
    system: "System",
  },
} as const;

/** One button for language and theme, used on every public page. */
export function PreferencesControls({ className }: { className?: string }) {
  const { locale, theme, setLocale, setTheme } = usePreferences();
  const t = copy[locale];
  const popoverId = `preferences-${useId().replace(/:/g, "")}`;

  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        aria-label={t.open}
        title={t.open}
        className={cn(
          "focus-ring inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--border)_90%,transparent)] bg-[var(--surface)] px-3 text-xs font-bold text-[var(--muted)] transition-colors hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] hover:text-[var(--foreground)]",
          className,
        )}
      >
        <Globe className="size-4" aria-hidden="true" />
        <span className="uppercase">{locale}</span>
      </button>

      <AnchoredPopover id={popoverId} className="w-48 p-2.5">
        <p className="flex items-center gap-2 px-1 pb-2 text-xs font-bold text-[var(--muted)]">
          <Languages className="size-3.5 text-[var(--primary)]" aria-hidden="true" />
          {t.language}
        </p>
        <div
          className="grid grid-cols-2 gap-1 rounded-full bg-[var(--surface-muted)] p-1"
          role="group"
          aria-label={t.language}
        >
          {(["en", "de"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLocale(value)}
              className={cn(
                "focus-ring flex h-8 items-center justify-center rounded-full px-3 text-xs font-bold transition",
                locale === value
                  ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
              aria-pressed={locale === value}
              lang={value}
              aria-label={value === "en" ? "English" : "Deutsch"}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>

        <p className="mt-3 flex items-center gap-2 px-1 pb-2 text-xs font-bold text-[var(--muted)]">
          <Palette className="size-3.5 text-[var(--primary)]" aria-hidden="true" />
          {t.appearance}
        </p>
        <ThemeSelector
          value={theme}
          onValueChange={setTheme}
          labels={{ light: t.light, dark: t.dark, system: t.system }}
          ariaLabel={t.appearance}
          iconOnly
        />
      </AnchoredPopover>
    </>
  );
}
