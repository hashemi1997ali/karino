"use client";

import { MonitorCog, Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";

import { SegmentedControl } from "@/components/ui/segmented-control";
import type { ThemePreference } from "@/lib/preferences";

type DocumentWithViewTransition = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

/**
 * Runs a theme change as a circular reveal growing from `origin` (the control
 * that was used). Falls back to an instant change without View Transitions
 * support or with reduced motion.
 */
export const withThemeReveal = (origin: Element | null, update: () => void): void => {
  const documentWithTransition = document as DocumentWithViewTransition;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!documentWithTransition.startViewTransition || reduceMotion || !origin) {
    update();
    return;
  }

  const rect = origin.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(centerX, window.innerWidth - centerX),
    Math.max(centerY, window.innerHeight - centerY),
  );
  const root = document.documentElement;
  root.style.setProperty("--theme-cx", `${centerX}px`);
  root.style.setProperty("--theme-cy", `${centerY}px`);
  root.style.setProperty("--theme-r", `${radius}px`);
  root.dataset.themeAnim = "1";

  const transition = documentWithTransition.startViewTransition(() => {
    flushSync(update);
  });
  transition.finished.finally(() => {
    delete root.dataset.themeAnim;
  });
};

export function ThemeSelector({
  value,
  onValueChange,
  labels,
  ariaLabel,
  className,
  compact = false,
  iconOnly = false,
}: {
  value: ThemePreference;
  onValueChange: (value: ThemePreference) => void;
  labels: Record<ThemePreference, string>;
  ariaLabel: string;
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const options = [
    { value: "system" as const, label: labels.system, icon: MonitorCog },
    { value: "light" as const, label: labels.light, icon: Sun },
    { value: "dark" as const, label: labels.dark, icon: Moon },
  ];

  return (
    <SegmentedControl
      value={value}
      onValueChange={(next) => {
        if (next === value) return;
        // The segment that was just clicked (or chosen by keyboard) has focus.
        withThemeReveal(document.activeElement, () => onValueChange(next));
      }}
      options={options}
      ariaLabel={ariaLabel}
      className={className}
      compact={compact}
      iconOnly={iconOnly}
    />
  );
}
