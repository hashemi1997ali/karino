"use client";

import { LayoutDashboard, LogIn, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/logo";
import { AnchoredPopover, closePopover } from "@/components/ui/anchored-popover";
import { buttonClassName } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/features/auth/auth-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { cn } from "@/lib/utils";

const copy = {
  en: {
    features: "Features",
    workflow: "How it works",
    security: "Security",
    tasks: "My tasks",
    contact: "Contact",
    dashboard: "My dashboard",
    login: "Log in",
    menu: "Menu",
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
    menu: "Menü",
    navigation: "Hauptnavigation",
  },
} as const;

export function PublicHeader({ overlay = false }: { overlay?: boolean }) {
  const { status } = useAuth();
  const { locale } = usePreferences();
  const pathname = usePathname();
  const t = copy[locale];
  const authenticated = status === "authenticated";
  const menuId = "public-menu";

  const navItems = [
    { href: "/#features", label: t.features },
    { href: "/#workflow", label: t.workflow },
    { href: "/#security", label: t.security },
    { href: "/contact", label: t.contact, active: pathname === "/contact" },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-4 z-50 sm:top-6",
          overlay ? null : "text-[var(--foreground)]",
        )}
      >
        <div className="portfolio-nav-shell mx-auto w-[calc(100%-2rem)] justify-between sm:w-[calc(100%-3rem)] lg:w-fit lg:justify-start">
          <Logo
            className="h-10 min-w-0 shrink-0 px-0.5"
            markClassName="size-8 rounded-xl shadow-none sm:size-9 lg:size-8"
            wordmarkClassName="text-base sm:text-[1.1rem]"
          />
          <span
            className="mx-1 hidden h-5 w-px bg-[var(--border)] lg:block"
            aria-hidden="true"
          />
          <nav
            className="hidden items-center gap-1 text-sm font-medium lg:flex"
            aria-label={t.navigation}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className="portfolio-nav-item focus-ring"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span
            className="mx-1 hidden h-5 w-px bg-[var(--border)] lg:block"
            aria-hidden="true"
          />
          {/* One account action: Log in, or the dashboard once signed in.
              Registration lives on the login page and the page's CTA section;
              language is in the footer. */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle className="size-10" />
            <Link
              href={authenticated ? "/dashboard" : "/login"}
              className={buttonClassName({ size: "sm", className: "h-10 px-4" })}
              aria-label={authenticated ? t.dashboard : t.login}
            >
              {authenticated ? (
                <LayoutDashboard className="size-4" />
              ) : (
                <LogIn className="size-4" />
              )}
              <span className={authenticated ? "max-[459px]:hidden" : undefined}>
                {authenticated ? t.dashboard : t.login}
              </span>
            </Link>
            <button
              type="button"
              popoverTarget={menuId}
              aria-label={t.menu}
              title={t.menu}
              className="focus-ring grid size-10 shrink-0 place-items-center rounded-full border border-[color-mix(in_srgb,var(--border)_90%,transparent)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:text-[var(--foreground)] lg:hidden"
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <AnchoredPopover id={menuId} sheet className="lg:hidden">
          <nav className="grid gap-0.5" aria-label={t.navigation}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                onClick={() => closePopover(menuId)}
                className="focus-ring flex h-11 items-center rounded-[var(--control-radius)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)] aria-[current=page]:text-[var(--primary)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </AnchoredPopover>
      </header>
      {!overlay && <div className="h-[5.75rem]" aria-hidden="true" />}
    </>
  );
}
