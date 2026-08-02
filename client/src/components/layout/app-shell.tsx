"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Bot,
  CheckSquare2,
  Headphones,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MonitorSmartphone,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Logo, LogoMark, LogoWordmark } from "@/components/logo";
import { UserAvatar } from "@/components/user-avatar";
import { Button, buttonClassName } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    today: "Today",
    tasks: "Tasks",
    assistant: "AI Assistant",
    account: "Account",
    profile: "Profile details",
    appearance: "Appearance",
    security: "Security",
    sessions: "Active sessions",
    accountNavigation: "Account settings",
    overview: "Overview",
    allTasks: "All tasks",
    users: "Users",
    support: "Support",
    contact: "Contact",
    administration: "Administration",
    navigation: "Workspace navigation",
    newTask: "New task",
    more: "More",
    moreDescription: "Account and administration options.",
    close: "Close menu",
    logout: "Sign out",
    loggedOut: "You have been signed out.",
    logoutTitle: "Sign out of this device?",
    logoutDescription: "This session will end on this device.",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
  },
  de: {
    today: "Heute",
    tasks: "Aufgaben",
    assistant: "KI-Assistent",
    account: "Konto",
    profile: "Profildaten",
    appearance: "Darstellung",
    security: "Sicherheit",
    sessions: "Aktive Sitzungen",
    accountNavigation: "Kontoeinstellungen",
    overview: "Übersicht",
    allTasks: "Alle Aufgaben",
    users: "Benutzer",
    support: "Support",
    contact: "Kontakt",
    administration: "Administration",
    navigation: "Arbeitsbereich-Navigation",
    newTask: "Neue Aufgabe",
    more: "Mehr",
    moreDescription: "Konto- und Administrationsoptionen.",
    close: "Menü schließen",
    logout: "Abmelden",
    loggedOut: "Du wurdest abgemeldet.",
    logoutTitle: "Von diesem Gerät abmelden?",
    logoutDescription: "Die Sitzung auf diesem Gerät wird beendet.",
    collapseSidebar: "Seitenleiste einklappen",
    expandSidebar: "Seitenleiste ausklappen",
  },
} as const;

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

type AccountSection = "profile" | "appearance" | "security" | "sessions";

const SIDEBAR_TRANSITION_MS = 300;

const persistSidebarPreference = (device: "tablet" | "desktop", collapsed: boolean) => {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `karino-sidebar-${device}=${
    collapsed ? "collapsed" : "expanded"
  }; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
};

export function AppShell({
  children,
  initialTabletSidebarCollapsed,
  initialDesktopSidebarCollapsed,
}: {
  children: ReactNode;
  initialTabletSidebarCollapsed: boolean;
  initialDesktopSidebarCollapsed: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = usePreferences();
  const { user, isAdmin, logout } = useAuth();
  const t = copy[locale];
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [tabletSidebarCollapsed, setTabletSidebarCollapsed] = useState(
    initialTabletSidebarCollapsed,
  );
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(
    initialDesktopSidebarCollapsed,
  );
  const [tabletSidebarOpening, setTabletSidebarOpening] = useState(false);
  const [desktopSidebarOpening, setDesktopSidebarOpening] = useState(false);
  const workspaceLinks = useMemo<NavItem[]>(
    () => [
      { href: "/dashboard", label: t.today, icon: LayoutDashboard },
      { href: "/tasks", label: t.tasks, icon: CheckSquare2 },
      { href: "/assistant", label: t.assistant, icon: Bot },
    ],
    [t],
  );
  const accountLink = useMemo<NavItem>(
    () => ({ href: "/account", label: t.account, icon: UserRound }),
    [t],
  );
  const accountSectionLinks = useMemo<Array<NavItem & { section: AccountSection }>>(
    () => [
      {
        href: "/account?tab=profile",
        label: t.profile,
        icon: UserRound,
        section: "profile",
      },
      {
        href: "/account?tab=appearance",
        label: t.appearance,
        icon: Palette,
        section: "appearance",
      },
      {
        href: "/account?tab=security",
        label: t.security,
        icon: KeyRound,
        section: "security",
      },
      {
        href: "/account?tab=sessions",
        label: t.sessions,
        icon: MonitorSmartphone,
        section: "sessions",
      },
    ],
    [t],
  );
  const adminLinks = useMemo<NavItem[]>(
    () => [
      { href: "/admin", label: t.overview, icon: ShieldCheck },
      { href: "/admin/tasks", label: t.allTasks, icon: CheckSquare2 },
      { href: "/admin/users", label: t.users, icon: UsersRound },
      { href: "/admin/support", label: t.support, icon: Headphones },
      { href: "/admin/contact", label: t.contact, icon: Mail },
    ],
    [t],
  );

  const allLinks = isAdmin
    ? [...workspaceLinks, accountLink, ...adminLinks]
    : [...workspaceLinks, accountLink];
  const current =
    [...allLinks]
      .sort((a, b) => b.href.length - a.href.length)
      .find(
        ({ href }) =>
          pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`)),
      ) ?? workspaceLinks[0];
  const requestedAccountSection = searchParams.get("tab");
  const activeAccountSection: AccountSection =
    requestedAccountSection === "appearance" ||
    requestedAccountSection === "security" ||
    requestedAccountSection === "sessions"
      ? requestedAccountSection
      : "profile";

  useEffect(() => {
    if (user && !user.onboardingCompleted) router.replace("/onboarding");
  }, [router, user]);

  const doLogout = async () => {
    setLogoutPending(true);
    try {
      await logout();
    } finally {
      setLogoutPending(false);
      setConfirmLogout(false);
      toast.success(t.loggedOut);
      router.replace("/");
    }
  };

  const navLink = ({ href, label, icon: Icon }: NavItem, compact = false) => {
    const active =
      pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        title={compact ? label : undefined}
        onClick={() => setMoreOpen(false)}
        className={cn(
          "focus-ring flex h-12 w-full items-center gap-3 overflow-hidden rounded-[10px] px-3.5 text-sm font-semibold transition-colors duration-150",
          active
            ? "bg-[var(--primary-soft)] text-[var(--primary)]"
            : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
        )}
      >
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        <span
          className={cn(
            "min-w-0 truncate whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none",
            compact
              ? "pointer-events-none opacity-0"
              : "opacity-100 delay-100 motion-reduce:delay-0",
          )}
        >
          {label}
        </span>
      </Link>
    );
  };

  const sidebarFooter = (compact: boolean) => (
    <div className="shrink-0 border-t p-3">
      <Link
        href="/account"
        aria-current={pathname === "/account" ? "page" : undefined}
        title={compact ? t.account : undefined}
        onClick={() => setMoreOpen(false)}
        className={cn(
          "focus-ring flex h-12 w-full items-center gap-3 overflow-hidden rounded-[var(--control-radius)] px-1 transition-colors",
          pathname === "/account"
            ? "bg-[var(--primary-soft)] text-[var(--primary)]"
            : "hover:bg-[var(--surface-muted)]",
        )}
      >
        <UserAvatar user={user} />
        <div
          className={cn(
            "min-w-0 flex-1 transition-opacity duration-150 motion-reduce:transition-none",
            compact
              ? "pointer-events-none opacity-0"
              : "opacity-100 delay-100 motion-reduce:delay-0",
          )}
        >
          <p className="truncate whitespace-nowrap text-sm font-semibold">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="mt-0.5 truncate whitespace-nowrap text-xs text-[var(--muted)]">
            {t.account}
          </p>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        className="mt-1 h-12 w-full justify-start gap-3 overflow-hidden px-3.5"
        aria-label={t.logout}
        title={compact ? t.logout : undefined}
        onClick={() => setConfirmLogout(true)}
      >
        <LogOut className="size-5 shrink-0" />
        <span
          className={cn(
            "whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none",
            compact
              ? "pointer-events-none opacity-0"
              : "opacity-100 delay-100 motion-reduce:delay-0",
          )}
        >
          {t.logout}
        </span>
      </Button>
    </div>
  );

  const adminDivider = (compact = false) => (
    <div className="relative my-4 h-5 shrink-0" aria-hidden="true">
      <span className="absolute inset-x-0 top-1/2 border-t" />
      <span
        className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap px-2 text-[11px] font-semibold text-[var(--muted)] transition-opacity duration-150 motion-reduce:transition-none",
          compact
            ? "bg-transparent opacity-0"
            : "bg-[var(--surface)] opacity-100 delay-100 motion-reduce:delay-0",
        )}
      >
        {t.administration}
      </span>
    </div>
  );

  const sidebarContent = (compact: boolean, opening: boolean, onToggle: () => void) => {
    const showOpenControl = compact;

    return (
      <>
        <div className="flex h-[var(--site-header-height)] shrink-0 items-center gap-2 overflow-hidden border-b bg-[var(--surface)] px-4">
          <div
            className={cn(
              "group/sidebar-logo relative h-11 min-w-0",
              compact ? "w-10 shrink-0" : "flex-1",
            )}
          >
            {showOpenControl ? (
              <button
                type="button"
                onClick={onToggle}
                aria-label={t.expandSidebar}
                aria-expanded={false}
                title={t.expandSidebar}
                className={cn(
                  "focus-ring absolute -left-0.5 top-0 z-0 size-11 rounded-[var(--control-radius)]",
                  compact && "hover:bg-[var(--surface-muted)]",
                )}
              />
            ) : (
              <Link
                href="/"
                aria-label="Karino"
                className="focus-ring absolute inset-y-0 left-0 z-20 w-28 rounded-xl"
              />
            )}
            <LogoMark
              className={cn(
                "pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2 transition-opacity duration-150 motion-reduce:transition-none",
                compact
                  ? "group-hover/sidebar-logo:opacity-0 group-focus-within/sidebar-logo:opacity-0"
                  : "opacity-100",
              )}
            />
            <LogoWordmark
              className={cn(
                "pointer-events-none absolute left-[3.125rem] top-1/2 z-10 -translate-y-1/2 transition-opacity duration-150 motion-reduce:transition-none",
                showOpenControl
                  ? "opacity-0"
                  : "opacity-100 delay-100 motion-reduce:delay-0",
              )}
            />
            <PanelLeftOpen
              className={cn(
                "pointer-events-none absolute left-5 top-1/2 z-10 size-5 -translate-x-1/2 -translate-y-1/2 text-[var(--foreground)] transition-opacity duration-150 motion-reduce:transition-none",
                compact
                  ? "opacity-0 group-hover/sidebar-logo:opacity-100 group-focus-within/sidebar-logo:opacity-100"
                  : "opacity-0",
              )}
              aria-hidden="true"
            />
          </div>
          {!showOpenControl && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "shrink-0 transition-opacity duration-150 motion-reduce:transition-none",
                opening ? "pointer-events-none opacity-0" : "opacity-100",
              )}
              aria-label={t.collapseSidebar}
              aria-expanded={true}
              aria-hidden={opening}
              tabIndex={opening ? -1 : undefined}
              title={t.collapseSidebar}
              onClick={onToggle}
            >
              <PanelLeftClose className="size-5" aria-hidden="true" />
            </Button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4">
          <nav className="space-y-1" aria-label={t.navigation}>
            {workspaceLinks.map((item) => navLink(item, compact))}
          </nav>
          {isAdmin && (
            <>
              {adminDivider(compact)}
              <nav className="space-y-1" aria-label={t.administration}>
                {adminLinks.map((item) => navLink(item, compact))}
              </nav>
            </>
          )}
        </div>
        {sidebarFooter(compact)}
      </>
    );
  };

  const toggleTabletSidebar = () => {
    const nextValue = !tabletSidebarCollapsed;
    setTabletSidebarCollapsed(nextValue);
    persistSidebarPreference("tablet", nextValue);
    setTabletSidebarOpening(!nextValue);
    if (!nextValue) {
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : SIDEBAR_TRANSITION_MS;
      window.setTimeout(() => setTabletSidebarOpening(false), duration);
    }
  };

  const toggleDesktopSidebar = () => {
    const nextValue = !desktopSidebarCollapsed;
    setDesktopSidebarCollapsed(nextValue);
    persistSidebarPreference("desktop", nextValue);
    setDesktopSidebarOpening(!nextValue);
    if (!nextValue) {
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : SIDEBAR_TRANSITION_MS;
      window.setTimeout(() => setDesktopSidebarOpening(false), duration);
    }
  };

  return (
    <div
      className={cn(
        "min-h-dvh bg-[var(--background)] transition-[padding] duration-300 ease-out motion-reduce:transition-none",
        tabletSidebarCollapsed ? "md:pl-[4.5rem]" : "md:pl-[15.5rem]",
        desktopSidebarCollapsed ? "xl:pl-[4.5rem]" : "xl:pl-[15.5rem]",
      )}
    >
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 max-md:hidden overflow-hidden flex-col border-r bg-[var(--surface)] transition-[width] duration-300 ease-out motion-reduce:transition-none md:flex xl:hidden",
          tabletSidebarCollapsed ? "w-[4.5rem]" : "w-[15.5rem]",
        )}
      >
        {sidebarContent(
          tabletSidebarCollapsed,
          tabletSidebarOpening,
          toggleTabletSidebar,
        )}
      </aside>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 max-xl:hidden overflow-hidden flex-col border-r bg-[var(--surface)] transition-[width] duration-300 ease-out motion-reduce:transition-none xl:flex",
          desktopSidebarCollapsed ? "w-[4.5rem]" : "w-[15.5rem]",
        )}
      >
        {sidebarContent(
          desktopSidebarCollapsed,
          desktopSidebarOpening,
          toggleDesktopSidebar,
        )}
      </aside>

      <header className="sticky top-0 z-40 h-[var(--site-header-height)] border-b bg-[var(--surface)]">
        <div className="mx-auto flex h-full w-full max-w-[88rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden">
              <Logo compact />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{current.label}</p>
              <p className="text-[11px] text-[var(--muted)] md:hidden">Karino</p>
            </div>
          </div>
          <Link
            href="/tasks?new=1"
            className={buttonClassName({
              size: "sm",
              className: "max-md:hidden h-11 px-4 md:inline-flex",
            })}
          >
            <Plus className="size-4" />
            <span>{t.newTask}</span>
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto min-h-[calc(100dvh-4.5rem)] w-full max-w-[88rem] px-4 py-6 pb-24 sm:px-6 md:pb-8 lg:px-8 lg:py-7"
      >
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid h-[calc(4.375rem+env(safe-area-inset-bottom))] grid-cols-4 border-t bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(15_23_42_/_0.08)] backdrop-blur md:hidden"
        aria-label={t.navigation}
      >
        {workspaceLinks.slice(0, 3).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-ring grid min-w-0 place-items-center content-center gap-1 rounded-lg text-[11px] font-semibold",
                active ? "text-[var(--primary)]" : "text-[var(--muted)]",
              )}
            >
              <Icon className="size-5" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label={t.more}
          aria-expanded={moreOpen}
          className={cn(
            "focus-ring grid place-items-center content-center gap-1 rounded-lg text-[11px] font-semibold",
            moreOpen || pathname.startsWith("/admin") || pathname === "/account"
              ? "text-[var(--primary)]"
              : "text-[var(--muted)]",
          )}
        >
          <Menu className="size-5" />
          {t.more}
        </button>
      </nav>

      <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm md:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-[100] flex w-[min(22rem,calc(100%-3rem))] flex-col border-r bg-[var(--surface)] shadow-2xl outline-none md:hidden">
            <div className="flex min-h-20 shrink-0 items-center gap-2 border-b px-3 py-2">
              <Dialog.Title className="sr-only">{t.more}</Dialog.Title>
              <Link
                href="/account?tab=profile"
                onClick={() => setMoreOpen(false)}
                className="focus-ring flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-[var(--control-radius)] px-2 transition-colors hover:bg-[var(--surface-muted)]"
              >
                <UserAvatar user={user} className="size-11" imageSizes="44px" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">
                    {t.account}
                  </span>
                </span>
              </Link>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label={t.close}>
                  <X className="size-5" />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              {t.moreDescription}
            </Dialog.Description>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              <p className="mb-2 px-3 text-xs font-semibold text-[var(--muted)]">
                {t.accountNavigation}
              </p>
              <nav className="space-y-1" aria-label={t.accountNavigation}>
                {accountSectionLinks.map(({ href, label, icon: Icon, section }) => {
                  const active =
                    pathname === "/account" && activeAccountSection === section;
                  return (
                    <Link
                      key={section}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "focus-ring flex min-h-12 items-center gap-3 rounded-[10px] px-3 text-sm font-semibold transition-colors duration-150",
                        active
                          ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
                      )}
                    >
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </nav>
              {isAdmin && (
                <>
                  {adminDivider()}
                  <nav className="space-y-1" aria-label={t.administration}>
                    {adminLinks.map((item) => navLink(item))}
                  </nav>
                </>
              )}
            </div>
            <div className="shrink-0 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button
                variant="ghost"
                size="sm"
                className="h-12 w-full justify-start"
                aria-label={t.logout}
                onClick={() => {
                  setMoreOpen(false);
                  setConfirmLogout(true);
                }}
              >
                <LogOut className="size-4" />
                {t.logout}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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
