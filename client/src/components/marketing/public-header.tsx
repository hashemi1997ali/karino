"use client";

import { ArrowRight, Inbox, Sparkles } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { PreferencesControls } from "@/components/preferences-controls";
import { buttonClassName } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    features: "Features",
    workflow: "AI + human",
    security: "Security",
    tickets: "Open tickets",
    assistant: "AI assistant",
    contact: "Contact",
    login: "Log in",
    start: "Start your desk",
    navigation: "Main navigation",
  },
  de: {
    features: "Funktionen",
    workflow: "KI + Mensch",
    security: "Sicherheit",
    tickets: "Tickets öffnen",
    assistant: "KI-Assistent",
    contact: "Kontakt",
    login: "Anmelden",
    start: "Desk starten",
    navigation: "Hauptnavigation",
  },
} as const;

export function PublicHeader() {
  const { status } = useAuth();
  const { locale } = usePreferences();
  const t = copy[locale];
  const authenticated = status === "authenticated";

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="mx-auto flex h-[4.5rem] max-w-[94rem] items-center justify-between gap-3 rounded-[1.35rem] border border-[color-mix(in_srgb,var(--border)_78%,transparent)] bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] px-3.5 shadow-[0_14px_42px_rgb(24_29_57_/_0.1)] backdrop-blur-xl sm:px-4.5">
          <Logo />
          <nav
            className="max-md:hidden items-center gap-1 rounded-[0.9rem] border bg-[var(--surface-muted)] p-1 text-xs font-bold text-[var(--muted)] md:flex"
            aria-label={t.navigation}
          >
            <Link
              href="/#features"
              className="rounded-[0.65rem] px-3 py-2 hover:bg-[var(--surface)] hover:text-[var(--primary)]"
            >
              {t.features}
            </Link>
            <Link
              href="/#workflow"
              className="rounded-[0.65rem] px-3 py-2 hover:bg-[var(--surface)] hover:text-[var(--primary)]"
            >
              {t.workflow}
            </Link>
            <Link
              href="/#security"
              className="rounded-[0.65rem] px-3 py-2 hover:bg-[var(--surface)] hover:text-[var(--primary)]"
            >
              {t.security}
            </Link>
            <Link
              href="/contact"
              className="rounded-[0.65rem] px-3 py-2 hover:bg-[var(--surface)] hover:text-[var(--primary)]"
            >
              {t.contact}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <PreferencesControls />
            {authenticated ? (
              <>
                <Link
                  href="/assistant"
                  className={buttonClassName({
                    variant: "secondary",
                    size: "sm",
                    className: "max-sm:hidden h-10 px-3.5 sm:inline-flex",
                  })}
                >
                  <Sparkles className="size-4" />
                  {t.assistant}
                </Link>
                <Link
                  href="/tickets"
                  className={buttonClassName({ size: "sm", className: "h-10 px-3.5" })}
                  aria-label={t.tickets}
                >
                  <Inbox className="size-4" />
                  <span className="max-[419px]:hidden min-[420px]:inline">
                    {t.tickets}
                  </span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonClassName({
                    variant: "secondary",
                    size: "sm",
                    className: "max-sm:hidden h-10 px-3.5 sm:inline-flex",
                  })}
                >
                  {t.login}
                </Link>
                <Link
                  href="/register"
                  className={buttonClassName({ size: "sm", className: "h-10 px-3.5" })}
                  aria-label={t.start}
                >
                  <span className="max-[419px]:hidden min-[420px]:inline">{t.start}</span>
                  <ArrowRight className="size-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="h-[5.75rem]" aria-hidden="true" />
    </>
  );
}
