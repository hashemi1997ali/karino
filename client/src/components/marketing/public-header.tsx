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
    tasks: "My tasks",
    dashboard: "My dashboard",
    login: "Log in",
    start: "Start free",
    navigation: "Main navigation",
  },
  de: {
    features: "Funktionen",
    workflow: "So funktioniert's",
    tasks: "Meine Aufgaben",
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
    <header className="sticky top-0 z-40 border-b bg-[color-mix(in_srgb,var(--background)_86%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[88rem] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav
          className="hidden items-center gap-8 text-sm font-bold text-[var(--muted)] md:flex"
          aria-label={t.navigation}
        >
          <a href="#features" className="hover:text-[var(--primary)]">
            {t.features}
          </a>
          <a href="#workflow" className="hover:text-[var(--primary)]">
            {t.workflow}
          </a>
          <Link
            href={authenticated ? "/tasks" : "/login?next=/tasks"}
            className="hover:text-[var(--primary)]"
          >
            {t.tasks}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <PreferencesControls />
          {authenticated ? (
            <Link
              href="/dashboard"
              className={buttonClassName({ size: "sm", className: "h-10 px-4" })}
              aria-label={t.dashboard}
            >
              <LayoutDashboard className="size-4" />
              <span className="hidden min-[420px]:inline">{t.dashboard}</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonClassName({
                  variant: "ghost",
                  size: "sm",
                  className: "hidden h-10 px-4 sm:inline-flex",
                })}
              >
                {t.login}
              </Link>
              <Link
                href="/register"
                className={buttonClassName({ size: "sm", className: "h-10 px-4" })}
                aria-label={t.start}
              >
                <span className="hidden min-[420px]:inline">{t.start}</span>
                <ArrowRight className="size-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
