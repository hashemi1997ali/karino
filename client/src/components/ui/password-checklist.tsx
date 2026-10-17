"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

// Same rules as the server's passwordSchema (server/src/schemas/authSchema.ts).
const rules = [
  { test: (value: string) => value.length >= 8, en: "8+ characters", de: "8+ Zeichen" },
  {
    test: (value: string) => /[a-z]/.test(value),
    en: "Lowercase letter",
    de: "Kleinbuchstabe",
  },
  {
    test: (value: string) => /[A-Z]/.test(value),
    en: "Uppercase letter",
    de: "Großbuchstabe",
  },
  { test: (value: string) => /\d/.test(value), en: "Number", de: "Zahl" },
];

/**
 * Live password requirements for Field's `after` slot. Opens while the field
 * has focus, or stays open when `open` is set (e.g. after a failed submit).
 */
export function PasswordChecklist({
  value,
  open = false,
}: {
  value: string;
  open?: boolean;
}) {
  const { locale } = usePreferences();

  return (
    <div className="field-collapse" data-open={open}>
      <div className="min-h-0 overflow-hidden">
        <ul
          className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5"
          aria-label={locale === "de" ? "Passwortanforderungen" : "Password requirements"}
        >
          {rules.map((rule) => {
            const met = rule.test(value);
            return (
              <li
                key={rule.en}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium transition-colors",
                  met ? "text-[var(--success)]" : "text-[var(--muted)]",
                )}
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full border transition-colors",
                    met
                      ? "border-transparent bg-[var(--success)] text-white"
                      : "border-[var(--border)]",
                  )}
                  aria-hidden="true"
                >
                  {met && <Check className="size-2.5" strokeWidth={3.5} />}
                </span>
                {rule[locale]}
                <span className="sr-only">
                  {met ? (locale === "de" ? " erfüllt" : " met") : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
