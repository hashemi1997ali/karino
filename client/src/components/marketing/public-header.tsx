"use client";

import { ArrowRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { PreferencesControls } from "@/components/preferences-controls";
import { buttonClassName } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    features: "Features",
    workflow: "How it works",
    security: "Security",
    tasks: "My tasks",
    contact: "Contact",
    dashboard: "My dashboard",
    login: "Log in",
    start: "Start free",
    navigation: "Main navigation",
  },
  de: {
    features: "Funktionen",
    workflow: "So funktioniert's",
    security: "Sicherheit",
    tasks: "Meine Aufgaben",
    contact: "Kontakt",
    dashboard: "Mein Dashboard",
    login: "Anmelden",
    start: "Kostenlos starten",
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
      <header className="fixed inset-x-0 top-0 z-40 h-[var(--site-header-height)] border-b bg-[var(--surface)]">
        <div className="mx-auto flex h-full max-w-[88rem] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav
            className="max-md:hidden items-center gap-8 text-sm font-bold text-[var(--muted)] md:flex"
            aria-label={t.navigation}
          >
            <Link href="/#features" className="hover:text-[var(--primary)]">
              {t.features}
            </Link>
            <Link href="/#workflow" className="hover:text-[var(--primary)]">
              {t.workflow}
            </Link>
            <Link href="/#security" className="hover:text-[var(--primary)]">
              {t.security}
            </Link>
            <Link href="/contact" className="hover:text-[var(--primary)]">
              {t.contact}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <PreferencesControls />
            {authenticated ? (
              <Link
                href="/dashboard"
                className={buttonClassName({ size: "sm", className: "h-11 px-4" })}
                aria-label={t.dashboard}
              >
                <LayoutDashboard className="size-4" />
                <span className="max-[419px]:hidden min-[420px]:inline">
                  {t.dashboard}
                </span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonClassName({
                    variant: "secondary",
                    size: "sm",
                    className: "max-sm:hidden h-11 px-4 sm:inline-flex",
                  })}
                >
                  {t.login}
                </Link>
                <Link
                  href="/register"
                  className={buttonClassName({ size: "sm", className: "h-11 px-4" })}
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
      <div className="h-[var(--site-header-height)]" aria-hidden="true" />
    </>
  );
}
