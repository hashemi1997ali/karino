"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  CheckSquare2,
  Headphones,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Plus,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { UserAvatar } from "@/components/user-avatar";
import { PreferencesControls } from "@/components/preferences-controls";
import { Button, buttonClassName } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    dashboard: "Dashboard",
    myTasks: "My tasks",
    account: "Account",
    users: "Users",
    support: "Support",
    contactForm: "Contact form",
    logout: "Sign out",
    loggedOut: "You have been signed out.",
    logoutTitle: "Sign out of this device?",
    logoutDescription:
      "This session will end on this device. You will need to sign in again to continue.",
    navigation: "Main navigation",
    navigationDescription: "Navigate your Karino workspace.",
    workspace: "Personal workspace",
    greeting: (name?: string) => `Hi ${name ?? "there"}, ready to focus?`,
    newTask: "New task",
    tasksShort: "Tasks",
    accountShort: "Account",
    more: "More",
    moreDescription: "Appearance, account actions, and administrator tools.",
    adminTools: "Administrator tools",
  },
  de: {
    dashboard: "Übersicht",
    myTasks: "Meine Aufgaben",
    account: "Konto",
    users: "Benutzer",
    support: "Support",
    contactForm: "Kontaktformular",
    logout: "Abmelden",
    loggedOut: "Du wurdest abgemeldet.",
    logoutTitle: "Von diesem Gerät abmelden?",
    logoutDescription:
      "Die Sitzung auf diesem Gerät wird beendet. Du musst dich erneut anmelden, um fortzufahren.",
    navigation: "Hauptnavigation",
    navigationDescription: "Navigiere durch deinen Karino-Arbeitsbereich.",
    workspace: "Persönlicher Arbeitsbereich",
    greeting: (name?: string) =>
      name
        ? `Hallo ${name}, bereit für den nächsten Schritt?`
        : "Hallo, bereit für den nächsten Schritt?",
    newTask: "Neue Aufgabe",
    tasksShort: "Aufgaben",
    accountShort: "Konto",
    more: "Mehr",
    moreDescription: "Darstellung, Kontoaktionen und Administrator-Werkzeuge.",
    adminTools: "Administrator-Werkzeuge",
  },
} as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = usePreferences();
  const t = copy[locale];
  const { user, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const normalLinks = [
    { href: "/dashboard", label: t.dashboard, icon: LayoutDashboard },
    { href: "/tasks", label: t.myTasks, icon: CheckSquare2 },
    { href: "/account", label: t.account, icon: UserRound },
  ];
  const adminLinks = [
    { href: "/admin/users", label: t.users, icon: UsersRound },
    { href: "/admin/support", label: t.support, icon: Headphones },
    { href: "/admin/contact", label: t.contactForm, icon: Mail },
  ];
  const links = isAdmin ? [...normalLinks, ...adminLinks] : normalLinks;

  const doLogout = async () => {
    setLogoutPending(true);
    try {
      await logout();
    } catch {
      // The auth provider still clears the local session when the request fails.
    } finally {
      setLogoutPending(false);
      setConfirmLogout(false);
      toast.success(t.loggedOut);
      router.replace("/");
    }
  };

  const requestLogout = () => {
    setMobileOpen(false);
    setConfirmLogout(true);
  };

  const desktopNav = (
    <>
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <Logo inverse />
        <PreferencesControls className="mr-11 lg:mr-0" placement="sidebar" />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5" aria-label={t.navigation}>
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-ring flex h-12 items-center gap-3 rounded-2xl px-3.5 text-sm font-bold transition",
                active
                  ? "bg-[var(--primary)] text-[var(--on-primary)] shadow-sm"
                  : "text-white/70 hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon className="size-5" />
              {label}
              {href.startsWith("/admin") && (
                <ShieldCheck className="ml-auto size-4 text-[var(--highlight)]" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-2xl bg-white/7 p-3">
          <UserAvatar user={user} />
          <div className="min-w-0 flex-1" dir="auto">
            <p className="truncate text-sm font-bold text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-white/70">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-white/70 hover:bg-white/8 hover:text-white"
          onClick={requestLogout}
        >
          <LogOut className="size-4" />
          {t.logout}
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[19rem_minmax(0,1fr)]">
      <aside className="fixed inset-y-3 left-3 z-30 hidden w-70 flex-col overflow-hidden rounded-[var(--container-radius)] border border-white/8 bg-[var(--navigation)] shadow-xl lg:flex">
        {desktopNav}
      </aside>

      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-slate-950/55 backdrop-blur-sm lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-[80] flex w-[min(86vw,20rem)] flex-col bg-[var(--navigation)] text-white shadow-2xl outline-none lg:hidden">
            <Dialog.Title className="sr-only">{t.more}</Dialog.Title>
            <Dialog.Description className="sr-only">
              {t.moreDescription}
            </Dialog.Description>
            <div className="flex items-center justify-between gap-2 px-5 py-5">
              <Logo inverse />
              <PreferencesControls placement="sidebar" />
            </div>
            <div className="px-5 pb-5 text-sm leading-6 text-white/70">
              {t.moreDescription}
            </div>
            {isAdmin && (
              <nav className="space-y-1 px-3 py-2" aria-label={t.adminTools}>
                <p className="px-3 pb-2 text-xs font-extrabold tracking-[.1em] text-[var(--highlight)] uppercase">
                  {t.adminTools}
                </p>
                {adminLinks.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "focus-ring flex h-12 items-center gap-3 rounded-2xl px-3.5 text-sm font-bold transition",
                        active
                          ? "bg-[var(--primary)] text-[var(--on-primary)]"
                          : "text-white/70 hover:bg-white/8 hover:text-white",
                      )}
                    >
                      <Icon className="size-5" />
                      {label}
                      <ShieldCheck className="ml-auto size-4 text-[var(--highlight)]" />
                    </Link>
                  );
                })}
              </nav>
            )}
            <div className="mt-auto border-t border-white/10 p-3">
              <div className="mb-2 flex items-center gap-3 rounded-2xl bg-white/7 p-3">
                <UserAvatar user={user} />
                <div className="min-w-0 flex-1" dir="auto">
                  <p className="truncate text-sm font-bold text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-xs text-white/70">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-white/70 hover:bg-white/8 hover:text-white"
                onClick={requestLogout}
              >
                <LogOut className="size-4" />
                {t.logout}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-3 z-20 mx-3 mt-3 flex h-16 items-center justify-between rounded-full border bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-3 shadow-sm backdrop-blur-xl sm:mx-5 sm:px-5 lg:mx-6 lg:px-6">
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-extrabold tracking-[.1em] text-[var(--primary)] uppercase">
              {t.workspace}
            </p>
            <p className="text-sm font-bold text-[var(--foreground)]" dir="auto">
              {t.greeting(user?.firstName)}
            </p>
          </div>
          <Link
            href="/tasks?new=1"
            className={buttonClassName({
              size: "sm",
              className: "h-11 shrink-0 px-3 sm:px-4",
            })}
            aria-label={t.newTask}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">{t.newTask}</span>
          </Link>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full min-w-0 max-w-[96rem] px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:py-10"
        >
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around overflow-hidden rounded-[1.35rem] border bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-1.5 shadow-xl backdrop-blur lg:hidden">
        {normalLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-ring grid min-w-0 flex-1 justify-items-center gap-1 rounded-2xl px-2 py-2 text-xs font-bold",
                active
                  ? "bg-[var(--primary-soft)] text-[var(--primary-dark)]"
                  : "text-[var(--muted)]",
              )}
            >
              <Icon className="size-5" />
              <span className="max-w-full truncate whitespace-nowrap">
                {href === "/tasks"
                  ? t.tasksShort
                  : href === "/account"
                    ? t.accountShort
                    : label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label={t.more}
          aria-expanded={mobileOpen}
          className={cn(
            "focus-ring grid min-w-0 flex-1 justify-items-center gap-1 rounded-2xl px-2 py-2 text-xs font-bold",
            pathname.startsWith("/admin") || mobileOpen
              ? "bg-[var(--primary-soft)] text-[var(--primary-dark)]"
              : "text-[var(--muted)]",
          )}
        >
          <Menu className="size-5" />
          <span className="max-w-full truncate whitespace-nowrap">{t.more}</span>
        </button>
      </nav>

      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title={t.logoutTitle}
        description={t.logoutDescription}
        confirmLabel={t.logout}
        loading={logoutPending}
        onConfirm={doLogout}
      />
    </div>
  );
}
