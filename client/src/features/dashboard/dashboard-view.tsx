"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  ListTodo,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { buttonClassName } from "@/components/ui/button";
import { TaskPriorityBadge } from "@/components/ui/domain-badge";
import { PageHeading } from "@/components/ui/page-heading";
import { PanelHeader, TextLink } from "@/components/ui/panel-header";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { TrendChart } from "@/components/ui/trend-chart";
import { useAuth } from "@/features/auth/auth-provider";
import { getTodayDashboardRequest, updateTaskRequest } from "@/features/tasks/api";
import { getErrorMessage } from "@/lib/api-error";
import type { Task } from "@/lib/types";
import { cn, formatNumber, getId } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    greetings: {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
    },
    intro: "Here’s what needs your attention today.",
    tasksToday: "Due today",
    completed: "Completed today",
    overdue: "Overdue",
    completionRate: "Overall completion",
    overallProgressDetail: (completed: string, total: string) =>
      `${completed} of ${total} tasks completed`,
    focus: "Today focus",
    focusSubtitle: "Overdue and due today",
    allTasks: "All tasks",
    upcoming: "Next 7 days",
    upcomingSummary: (count: string) => `${count} open in the next 7 days`,
    aiBrief: "Plan with AI",
    aiSubtitle: "Your assistant, with today's context",
    aiAction: "Fix my schedule",
    aiPlanAction: "Plan my day",
    aiOverdue: (count: number) =>
      `${count} overdue ${count === 1 ? "task needs" : "tasks need"} a new date.`,
    aiToday: (count: number) =>
      `${count} ${count === 1 ? "task is" : "tasks are"} due today. Ask for the best order.`,
    aiIdle: "Nothing urgent. Ask the assistant to plan what comes next.",
    aiOverduePrompt: "Help me reschedule my overdue tasks and plan the rest of today.",
    aiPlanPrompt: "Plan my day based on my current tasks and priorities.",
    weekly: "Weekly progress",
    weeklySubtitle: "Tasks completed in the last 7 days",
    dueTodayDetail: (count: number) =>
      count ? "Due before midnight" : "Nothing due today",
    completedDetail: (week: string) => `${week} this week`,
    overdueDetail: (count: number) => (count ? "Need a new date" : "All on track"),
    noTasks: "No active tasks need your attention.",
    today: "Today",
    overdueLabel: "Overdue",
    noUpcoming: "No tasks",
    taskCountShort: (count: string, value: number) =>
      `${count} task${value === 1 ? "" : "s"}`,
    openTasks: (count: number) => `${count} open task${count === 1 ? "" : "s"}`,
    completedTasks: (count: number) => `${count} task${count === 1 ? "" : "s"} completed`,
    priority: { low: "Low", medium: "Medium", high: "High" },
    status: { todo: "To do", "in-progress": "In progress", done: "Done" },
  },
  de: {
    greetings: {
      morning: "Guten Morgen",
      afternoon: "Guten Tag",
      evening: "Guten Abend",
    },
    intro: "Das benötigt heute deine Aufmerksamkeit.",
    tasksToday: "Heute fällig",
    completed: "Heute abgeschlossen",
    overdue: "Überfällig",
    completionRate: "Gesamter Fortschritt",
    overallProgressDetail: (completed: string, total: string) =>
      `${completed} von ${total} Aufgaben erledigt`,
    focus: "Fokus für heute",
    focusSubtitle: "Überfällig und heute fällig",
    allTasks: "Alle Aufgaben",
    upcoming: "Nächste 7 Tage",
    upcomingSummary: (count: string) => `${count} offen in den nächsten 7 Tagen`,
    aiBrief: "Mit KI planen",
    aiSubtitle: "Dein Assistent mit dem Kontext von heute",
    aiAction: "Zeitplan reparieren",
    aiPlanAction: "Tag planen",
    aiOverdue: (count: number) =>
      `${count} überfällige ${count === 1 ? "Aufgabe braucht" : "Aufgaben brauchen"} ein neues Datum.`,
    aiToday: (count: number) =>
      `${count} ${count === 1 ? "Aufgabe ist" : "Aufgaben sind"} heute fällig. Frag nach der besten Reihenfolge.`,
    aiIdle: "Nichts Dringendes. Lass den Assistenten planen, was als Nächstes kommt.",
    aiOverduePrompt:
      "Hilf mir, meine überfälligen Aufgaben neu zu planen und den Rest des Tages zu ordnen.",
    aiPlanPrompt: "Plane meinen Tag anhand meiner aktuellen Aufgaben und Prioritäten.",
    weekly: "Wochenfortschritt",
    weeklySubtitle: "In den letzten 7 Tagen erledigte Aufgaben",
    dueTodayDetail: (count: number) =>
      count ? "Bis Mitternacht fällig" : "Heute nichts fällig",
    completedDetail: (week: string) => `${week} diese Woche`,
    overdueDetail: (count: number) =>
      count ? "Brauchen ein neues Datum" : "Alles im Plan",
    noTasks: "Keine aktiven Aufgaben benötigen deine Aufmerksamkeit.",
    today: "Heute",
    overdueLabel: "Überfällig",
    noUpcoming: "Keine Aufgaben",
    taskCountShort: (count: string, value: number) =>
      `${count} Aufgabe${value === 1 ? "" : "n"}`,
    openTasks: (count: number) => `${count} offene Aufgabe${count === 1 ? "" : "n"}`,
    completedTasks: (count: number) =>
      `${count} Aufgabe${count === 1 ? "" : "n"} erledigt`,
    priority: { low: "Niedrig", medium: "Mittel", high: "Hoch" },
    status: { todo: "Offen", "in-progress": "In Bearbeitung", done: "Erledigt" },
  },
} as const;

const getGreetingKey = (): "morning" | "afternoon" | "evening" => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};

export function DashboardView() {
  const { user } = useAuth();
  const { locale, intlLocale } = usePreferences();
  const t = copy[locale];
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "today"],
    queryFn: getTodayDashboardRequest,
  });
  const statusMutation = useMutation({
    mutationFn: (task: Task) =>
      updateTaskRequest(getId(task), {
        status: task.status === "done" ? "todo" : "done",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  // The heading only needs the signed-in user, so it stays in place while the
  // dashboard loads or fails.
  const heading = (
    <PageHeading
      title={`${t.greetings[getGreetingKey()]}, ${user?.firstName ?? ""}`}
      description={t.intro}
    />
  );

  if (dashboardQuery.isPending) {
    return (
      <div className="space-y-5">
        {heading}
        <DashboardSkeleton />
      </div>
    );
  }
  if (dashboardQuery.isError) {
    return (
      <div className="space-y-5">
        {heading}
        <ErrorState
          message={getErrorMessage(dashboardQuery.error, locale)}
          retry={() => void dashboardQuery.refetch()}
        />
      </div>
    );
  }

  const dashboard = dashboardQuery.data;
  const { stats } = dashboard;
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: dashboard.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dashboard.generatedAt));
  const dateKeyFor = (date: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: dashboard.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  const upcomingTaskTotal = dashboard.upcoming.reduce(
    (total, day) => total + day.count,
    0,
  );
  const completedThisWeek = dashboard.weeklyProgress.reduce(
    (total, day) => total + day.completed,
    0,
  );
  const completionPercent = Math.min(100, Math.max(0, stats.completionRate * 100));
  const hasOverdue = stats.overdue > 0;

  return (
    <div className="space-y-5">
      {heading}
      <time className="sr-only" dateTime={dashboard.generatedAt}>
        {new Intl.DateTimeFormat(intlLocale, { dateStyle: "full" }).format(
          new Date(dashboard.generatedAt),
        )}
      </time>

      {/* One summary panel instead of four unrelated cards. */}
      <section className="desk-panel overflow-hidden" aria-label={t.completionRate}>
        <dl className="desk-stagger grid grid-cols-2 divide-[color-mix(in_srgb,var(--border)_80%,transparent)] lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:max-lg:border-b [&>*:nth-child(odd)]:max-lg:border-r">
          <div className="summary-figure">
            <dt className="summary-label">
              <ListTodo className="size-3.5" aria-hidden="true" />
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
                {t.overallProgressDetail(
                  formatNumber(stats.totalCompleted, intlLocale),
                  formatNumber(stats.totalTasks, intlLocale),
                )}
              </span>
            </dd>
          </div>
          <div className="summary-figure">
            <dt className="summary-label">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {t.tasksToday}
            </dt>
            <dd className="metric-value">{formatNumber(stats.tasksToday, intlLocale)}</dd>
            <dd className="text-xs text-[var(--muted)]">
              {t.dueTodayDetail(stats.tasksToday)}
            </dd>
          </div>
          <div className="summary-figure">
            <dt className="summary-label">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {t.completed}
            </dt>
            <dd className="metric-value">{formatNumber(stats.completed, intlLocale)}</dd>
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
              {formatNumber(stats.overdue, intlLocale)}
            </dd>
            <dd
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium",
                hasOverdue ? "text-[var(--danger)]" : "text-[var(--success)]",
              )}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {t.overdueDetail(stats.overdue)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
        <div className="grid min-w-0 gap-5">
          <section className="desk-panel flex min-w-0 flex-col overflow-hidden">
            <PanelHeader
              icon={Target}
              title={t.focus}
              subtitle={t.focusSubtitle}
              action={<TextLink href="/tasks">{t.allTasks}</TextLink>}
              className="p-5 pb-3"
            />
            {dashboard.focusTasks.length === 0 ? (
              <div className="mx-5 mb-5 flex min-h-24 items-center justify-center gap-3 rounded-[var(--control-radius)] bg-[var(--surface-muted)]/60 px-4 text-center text-sm text-[var(--muted)]">
                <CalendarCheck2 className="size-5 shrink-0 text-[var(--success)]" />
                <span>{t.noTasks}</span>
              </div>
            ) : (
              <ul className="grid gap-1.5 px-3 pb-3">
                {dashboard.focusTasks.map((task) => {
                  const taskDateKey = task.dueDate ? dateKeyFor(task.dueDate) : "";
                  const overdue = taskDateKey < todayKey && task.status !== "done";
                  return (
                    <li
                      key={getId(task)}
                      className="group flex min-h-16 items-center gap-3 rounded-[var(--control-radius)] px-2.5 py-2 transition-colors hover:bg-[var(--surface-muted)]/70"
                    >
                      <button
                        type="button"
                        onClick={() => statusMutation.mutate(task)}
                        aria-label={`${t.status[task.status]}: ${task.title}`}
                        disabled={statusMutation.isPending}
                        className="focus-ring grid size-9 shrink-0 place-items-center rounded-full text-[var(--muted)] transition-colors hover:text-[var(--primary)] disabled:opacity-50"
                      >
                        {task.status === "done" ? (
                          <CheckCircle2 className="size-5 text-[var(--primary)]" />
                        ) : (
                          <Circle className="size-5" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold">{task.title}</h3>
                        <p
                          className={cn(
                            "mt-0.5 flex items-center gap-1.5 text-xs",
                            overdue ? "text-[var(--danger)]" : "text-[var(--muted)]",
                          )}
                        >
                          <span
                            className="size-1.5 rounded-full bg-current"
                            aria-hidden="true"
                          />
                          {overdue ? t.overdueLabel : t.today}
                          <span className="text-[var(--muted)]">·</span>
                          <span className="text-[var(--muted)]">
                            {t.status[task.status]}
                          </span>
                        </p>
                      </div>
                      <TaskPriorityBadge priority={task.priority}>
                        {t.priority[task.priority]}
                      </TaskPriorityBadge>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="desk-panel overflow-hidden p-5">
            <PanelHeader
              icon={CalendarDays}
              title={t.upcoming}
              subtitle={t.upcomingSummary(formatNumber(upcomingTaskTotal, intlLocale))}
              action={<TextLink href="/tasks">{t.allTasks}</TextLink>}
            />
            <div className="-mx-1 mt-4 overflow-x-auto px-1 pb-1">
              <ol className="grid min-w-[30rem] grid-cols-7 gap-2">
                {dashboard.upcoming.map((day) => {
                  const date = new Date(`${day.date}T12:00:00Z`);
                  const dateLabel = new Intl.DateTimeFormat(intlLocale, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                  }).format(date);
                  return (
                    <li
                      key={day.date}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-[var(--control-radius)] px-1 py-3 text-center transition-colors",
                        day.count
                          ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "bg-[var(--surface-muted)]/60 text-[var(--muted)]",
                      )}
                      aria-label={`${dateLabel}: ${
                        day.count ? t.openTasks(day.count) : t.noUpcoming
                      }`}
                    >
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em]">
                        {new Intl.DateTimeFormat(intlLocale, {
                          weekday: "short",
                          timeZone: "UTC",
                        }).format(date)}
                      </span>
                      <span
                        className={cn(
                          "text-xl font-semibold tracking-[-0.03em] tabular-nums",
                          day.count ? "text-[var(--foreground)]" : null,
                        )}
                      >
                        {new Intl.DateTimeFormat(intlLocale, {
                          day: "numeric",
                          timeZone: "UTC",
                        }).format(date)}
                      </span>
                      <span className="text-[0.6875rem] font-semibold tabular-nums">
                        {day.count > 0
                          ? t.taskCountShort(
                              formatNumber(day.count, intlLocale),
                              day.count,
                            )
                          : "—"}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        </div>

        <div className="grid min-w-0 gap-5">
          {/* One contextual suggestion from today's numbers; the button opens
              the assistant with a matching prompt pre-filled, not sent. */}
          <section className="desk-panel overflow-hidden bg-[linear-gradient(150deg,color-mix(in_srgb,var(--primary-soft)_70%,var(--surface)),var(--surface)_70%)] p-5">
            <PanelHeader icon={Sparkles} title={t.aiBrief} subtitle={t.aiSubtitle} />
            <p className="mt-4 text-sm leading-6 text-[var(--foreground)]/80">
              {hasOverdue
                ? t.aiOverdue(stats.overdue)
                : stats.tasksToday > 0
                  ? t.aiToday(stats.tasksToday)
                  : t.aiIdle}
            </p>
            <Link
              href={`/assistant?prompt=${encodeURIComponent(
                hasOverdue ? t.aiOverduePrompt : t.aiPlanPrompt,
              )}`}
              className={buttonClassName({ className: "mt-4 flex w-full" })}
            >
              <Sparkles className="size-4" />
              {hasOverdue ? t.aiAction : t.aiPlanAction}
            </Link>
          </section>

          <section className="desk-panel min-w-0 overflow-hidden p-5">
            <PanelHeader icon={TrendingUp} title={t.weekly} subtitle={t.weeklySubtitle} />
            <TrendChart
              data={dashboard.weeklyProgress.map((item) => ({
                key: item.date,
                value: item.completed,
                shortLabel: new Intl.DateTimeFormat(intlLocale, {
                  weekday: "short",
                  timeZone: "UTC",
                }).format(new Date(`${item.date}T12:00:00Z`)),
                accessibleLabel: `${new Intl.DateTimeFormat(intlLocale, {
                  dateStyle: "medium",
                  timeZone: "UTC",
                }).format(new Date(`${item.date}T12:00:00Z`))}: ${t.completedTasks(
                  item.completed,
                )}`,
              }))}
              label={t.weekly}
              className="mt-3 h-40"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
