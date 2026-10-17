"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { withThemeReveal } from "@/components/ui/theme-selector";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const subscribeToMount = () => () => undefined;

const useIsMounted = (): boolean =>
  useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false,
  );

export function ThemeToggle({ className }: { className?: string }) {
  const mounted = useIsMounted();
  const { locale, resolvedTheme, setTheme } = usePreferences();
  const isDark = mounted && resolvedTheme === "dark";
  const label =
    locale === "de"
      ? isDark
        ? "Zum hellen Design wechseln"
        : "Zum dunklen Design wechseln"
      : isDark
        ? "Switch to light theme"
        : "Switch to dark theme";

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const target = event.currentTarget;
    withThemeReveal(target, () => setTheme(isDark ? "light" : "dark"));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={mounted ? label : locale === "de" ? "Design wechseln" : "Toggle theme"}
      aria-pressed={mounted ? isDark : undefined}
      className={cn(
        "focus-ring relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--foreground)_6%,transparent)] bg-[var(--surface)] text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--surface-muted)]",
        className,
      )}
    >
      <span aria-hidden="true" className="relative size-4">
        <Sun
          className={cn(
            "absolute inset-0 size-4 transition-[opacity,transform] duration-300 motion-reduce:transition-none",
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 size-4 transition-[opacity,transform] duration-300 motion-reduce:transition-none",
            !isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0",
          )}
        />
      </span>
    </button>
  );
}
