"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Headphones,
  Inbox,
  ListTodo,
  Mail,
  TrendingUp,
  UsersRound,
  UserX,
} from "lucide-react";
import Link from "next/link";

import { PageHeading } from "@/components/ui/page-heading";
import { PanelHeader } from "@/components/ui/panel-header";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { TrendChart } from "@/components/ui/trend-chart";
import { getAdminOverviewRequest } from "@/features/admin/api";
import { getErrorMessage } from "@/lib/api-error";
import { cn, formatNumber } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    title: "Admin overview",
    subtitle: "Monitor task progress and administrative queues.",
    totalUsers: "Total users",
    totalTasks: "Total tasks",
    completedToday: "Completed today",
    completionRate: "Overall task completion",
    completionDetail: (completed: string, total: string) =>
      `${completed} of ${total} tasks completed`,
    adminQueues: "Admin queues",
    queueSummary: (count: string) => `${count} items waiting for staff`,
    usersDetail: (banned: string) => `${banned} banned`,
    tasksDetail: (open: string) => `${open} still open`,
    completedDetail: (week: string) => `${week} this week`,
    overdueDetail: (count: number) => (count ? "Across all users" : "All on track"),
    overdue: "Overdue tasks",
    support: "Waiting support chats",
    contact: "Unanswered contact forms",
    banned: "Banned users",
    weekly: "Weekly progress",
    weeklySubtitle: "Tasks completed by all users, last 7 days",
    completedTasks: (count: number) => `${count} task${count === 1 ? "" : "s"} completed`,
  },
  de: {
    title: "Admin-Übersicht",
    subtitle: "Überwache den Aufgabenfortschritt und administrative Vorgänge.",
    totalUsers: "Benutzer gesamt",
    totalTasks: "Aufgaben gesamt",
    completedToday: "Heute abgeschlossen",
    completionRate: "Gesamte Aufgabenerledigung",
    completionDetail: (completed: string, total: string) =>
      `${completed} von ${total} Aufgaben erledigt`,
    adminQueues: "Admin-Warteschlangen",
    queueSummary: (count: string) => `${count} Einträge warten auf das Team`,
    usersDetail: (banned: string) => `${banned} gesperrt`,
    tasksDetail: (open: string) => `${open} noch offen`,
    completedDetail: (week: string) => `${week} diese Woche`,
    overdueDetail: (count: number) => (count ? "Über alle Benutzer" : "Alles im Plan"),
    overdue: "Überfällige Aufgaben",
    support: "Wartende Support-Chats",
    contact: "Unbeantwortete Kontaktformulare",
    banned: "Gesperrte Benutzer",
    weekly: "Wochenfortschritt",
    weeklySubtitle: "Von allen Benutzern erledigt, letzte 7 Tage",
    completedTasks: (count: number) =>
      `${count} Aufgabe${count === 1 ? "" : "n"} erledigt`,
  },
} as const;

export function AdminOverviewView() {
  const { locale, intlLocale } = usePreferences();
  const t = copy[locale];
  const query = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: getAdminOverviewRequest,
  });

  const heading = <PageHeading title={t.title} description={t.subtitle} />;

  if (query.isPending) {
    return (
      <div className="space-y-5">
        {heading}
        <LoadingState />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="space-y-5">
        {heading}
        <ErrorState
          message={getErrorMessage(query.error, locale)}
          retry={() => void query.refetch()}
        />
      </div>
    );
  }

  const data = query.data;
  const attention = [
    {
      label: t.support,
      value: data.waitingSupport,
      href: "/admin/support",
      icon: Headphones,
    },
    {
      label: t.contact,
      value: data.unansweredContacts,
      href: "/admin/contact",
      icon: Mail,
    },
    {
      label: t.banned,
      value: data.bannedUsers,
      href: "/admin/users?banned=true",
      icon: UserX,
    },
  ];
  const completionPercent = Math.min(100, Math.max(0, data.completionRate * 100));
  const completedThisWeek = data.weeklyProgress.reduce(
    (total, day) => total + day.completed,
    0,
  );
  const queueTotal = attention.reduce((total, item) => total + item.value, 0);
  const hasOverdue = data.overdueTasks > 0;

  return (
    <div className="space-y-5">
      {heading}

      {/* Same summary panel as the personal dashboard, with the staff figures. */}
      <section className="desk-panel overflow-hidden" aria-label={t.completionRate}>
        <dl className="desk-stagger grid grid-cols-2 divide-[color-mix(in_srgb,var(--border)_80%,transparent)] lg:grid-cols-5 lg:divide-x [&>*:nth-child(-n+4)]:max-lg:border-b [&>*:nth-child(odd)]:max-lg:border-r [&>*:first-child]:max-lg:col-span-2 [&>*:first-child]:max-lg:border-r-0">
          <div className="summary-figure">
            <dt className="summary-label">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {t.completionRate}
            </dt>
            <dd className="metric-value">
              {Math.round(completionPercent)}
              <small>%</small>
            </dd>
            <dd className="grid gap-2">
              <div
                className="summary-meter"
                role="progressbar"
                aria-label={t.completionRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(completionPercent)}
              >
                <i style={{ transform: `scaleX(${completionPercent / 100})` }} />
              </div>
              <span className="text-xs text-[var(--muted)]">
                {t.completionDetail(
                  formatNumber(data.completedTasks, intlLocale),
                  formatNumber(data.totalTasks, intlLocale),
                )}
              </span>
            </dd>
          </div>
          <div className="summary-figure">
            <dt className="summary-label">
              <UsersRound className="size-3.5" aria-hidden="true" />
              {t.totalUsers}
            </dt>
            <dd className="metric-value">{formatNumber(data.totalUsers, intlLocale)}</dd>
            <dd className="text-xs text-[var(--muted)]">
              {t.usersDetail(formatNumber(data.bannedUsers, intlLocale))}
            </dd>
          </div>
          <div className="summary-figure">
            <dt className="summary-label">
              <ListTodo className="size-3.5" aria-hidden="true" />
              {t.totalTasks}
            </dt>
            <dd className="metric-value">{formatNumber(data.totalTasks, intlLocale)}</dd>
            <dd className="text-xs text-[var(--muted)]">
              {t.tasksDetail(formatNumber(data.openTasks, intlLocale))}
            </dd>
          </div>
          <div className="summary-figure">
            <dt className="summary-label">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {t.completedToday}
            </dt>
            <dd className="metric-value">
              {formatNumber(data.completedToday, intlLocale)}
            </dd>
            <dd className="text-xs text-[var(--muted)]">
              {t.completedDetail(formatNumber(completedThisWeek, intlLocale))}
            </dd>
          </div>
          <div className="summary-figure">
            <dt className="summary-label">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              {t.overdue}
            </dt>
            <dd className={cn("metric-value", hasOverdue && "text-[var(--danger)]")}>
              {formatNumber(data.overdueTasks, intlLocale)}
            </dd>
            <dd
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium",
                hasOverdue ? "text-[var(--danger)]" : "text-[var(--success)]",
              )}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {t.overdueDetail(data.overdueTasks)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
        <section className="desk-panel min-w-0 overflow-hidden">
          <PanelHeader
            icon={Inbox}
            title={t.adminQueues}
            subtitle={t.queueSummary(formatNumber(queueTotal, intlLocale))}
            className="p-5 pb-3"
          />
          <ul className="grid gap-1.5 px-3 pb-3">
            {attention.map(({ label, value, href, icon: Icon }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="focus-ring group flex min-h-14 items-center gap-3 rounded-[var(--control-radius)] px-2.5 py-2 transition-colors hover:bg-[var(--surface-muted)]/70"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)] transition-colors group-hover:text-[var(--primary)]">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {label}
                  </span>
                  <span
                    className={cn(
                      "min-w-8 rounded-full px-2.5 py-1 text-center text-xs font-bold tabular-nums",
                      value > 0
                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "bg-[var(--surface-muted)] text-[var(--muted)]",
                    )}
                  >
                    {formatNumber(value, intlLocale)}
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="desk-panel min-w-0 overflow-hidden p-5">
          <PanelHeader icon={TrendingUp} title={t.weekly} subtitle={t.weeklySubtitle} />
          <TrendChart
            data={data.weeklyProgress.map((item) => {
              const date = new Date(`${item.date}T12:00:00Z`);
              const dateLabel = new Intl.DateTimeFormat(intlLocale, {
                dateStyle: "medium",
                timeZone: "UTC",
              }).format(date);
              return {
                key: item.date,
                value: item.completed,
                shortLabel: new Intl.DateTimeFormat(intlLocale, {
                  weekday: "short",
                  timeZone: "UTC",
                }).format(date),
                accessibleLabel: `${dateLabel}: ${t.completedTasks(item.completed)}`,
              };
            })}
            label={t.weekly}
            className="mt-3 h-40"
          />
        </section>
      </div>
    </div>
  );
}
