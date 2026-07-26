"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
  ListTodo,
} from "lucide-react";
import Link from "next/link";

import { Badge, Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-provider";
import { getTaskSummaryRequest, getTasksRequest } from "@/features/tasks/api";
import { getErrorMessage } from "@/lib/api-error";
import { formatDate, formatNumber, formatPercent, getId } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    total: "Total tasks",
    inProgress: "In progress",
    done: "Completed",
    overdue: "Overdue",
    eyebrow: "Today at a glance",
    greeting: (name?: string) => `Hello ${name ?? "there"}, how is your day going?`,
    intro: "Track your most important work and overall progress in one place.",
    upcoming: "Upcoming work",
    upcomingHint: "The nearest tasks by due date",
    viewAll: "View all",
    noTasks: "You have not created a task yet.",
    noDueDate: "No due date",
    todo: "To do",
    overall: "Overall progress",
    overallHint: "Share of completed tasks",
    completed: "completed",
    remaining: "left",
    active: "active",
    finished: "done",
  },
  de: {
    total: "Aufgaben gesamt",
    inProgress: "In Bearbeitung",
    done: "Erledigt",
    overdue: "Überfällig",
    eyebrow: "Heute auf einen Blick",
    greeting: (name?: string) =>
      name ? `Hallo ${name}, wie läuft dein Tag?` : "Hallo, wie läuft dein Tag?",
    intro: "Behalte wichtige Aufgaben und deinen Fortschritt an einem Ort im Blick.",
    upcoming: "Anstehende Aufgaben",
    upcomingHint: "Die nächsten Aufgaben nach Fälligkeit",
    viewAll: "Alle anzeigen",
    noTasks: "Du hast noch keine Aufgabe erstellt.",
    noDueDate: "Kein Fälligkeitsdatum",
    todo: "Offen",
    overall: "Gesamtfortschritt",
    overallHint: "Anteil der erledigten Aufgaben",
    completed: "erledigt",
    remaining: "offen",
    active: "aktiv",
    finished: "fertig",
  },
} as const;

export function DashboardView() {
  const { user } = useAuth();
  const { locale, intlLocale } = usePreferences();
  const t = copy[locale];
  const summaryQuery = useQuery({
    queryKey: ["tasks", "summary"],
    queryFn: getTaskSummaryRequest,
  });
  const upcomingQuery = useQuery({
    queryKey: ["tasks", "upcoming"],
    queryFn: () =>
      getTasksRequest({ page: 1, limit: 5, sortBy: "dueDate", order: "asc" }),
  });

  if (summaryQuery.isPending || upcomingQuery.isPending) return <LoadingState />;
  if (summaryQuery.isError || upcomingQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(summaryQuery.error ?? upcomingQuery.error, locale)}
        retry={() => {
          void summaryQuery.refetch();
          void upcomingQuery.refetch();
        }}
      />
    );
  }

  const summary = summaryQuery.data;
  const upcoming = upcomingQuery.data.tasks;
  const progress = summary.total === 0 ? 0 : summary.done / summary.total;
  const stats = [
    {
      label: t.total,
      value: summary.total,
      icon: ListTodo,
      color: "bg-white/10 text-white",
        card: "bg-[var(--navigation)] text-white border-[var(--navigation)]",
    },
    {
      label: t.inProgress,
      value: summary.inProgress,
      icon: Clock3,
      color: "bg-white/16 text-white",
      card: "bg-[var(--primary)] text-[var(--on-primary)] border-[var(--primary)]",
    },
    {
      label: t.done,
      value: summary.done,
      icon: CheckCircle2,
      color: "bg-black/8 text-[var(--on-highlight)]",
      card: "bg-[var(--highlight)] text-[var(--on-highlight)] border-[var(--highlight)]",
    },
    {
      label: t.overdue,
      value: summary.overdue,
      icon: AlertTriangle,
      color: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
      card: "bg-[var(--surface)]",
    },
  ];

  return (
    <div>
      <section className="relative overflow-hidden rounded-[var(--container-radius)] border bg-[var(--surface)] p-6 sm:p-8">
        <div className="paper-grid absolute inset-0 opacity-30" />
        <span className="absolute -right-10 -top-12 size-48 rounded-full bg-[var(--highlight)]/45 blur-3xl" />
        <div>
          <p className="eyebrow relative text-[var(--primary)]">{t.eyebrow}</p>
          <h1
            className="relative mt-3 max-w-3xl text-3xl leading-tight font-black tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl"
            dir="auto"
          >
            {t.greeting(user?.firstName)}
          </h1>
          <p className="relative mt-3 text-sm text-[var(--muted)]">{t.intro}</p>
        </div>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, card }) => (
          <Card
            key={label}
            className={`flex min-h-36 flex-col justify-between p-5 ${card}`}
          >
            <span className={`grid size-11 place-items-center rounded-2xl ${color}`}>
              <Icon className="size-5" />
            </span>
            <div className="mt-5 flex items-end justify-between gap-3">
              <div className="text-3xl font-black tracking-tight text-inherit">
                {formatNumber(value, intlLocale)}
              </div>
              <div className="pb-1 text-right text-xs font-bold opacity-65">{label}</div>
            </div>
          </Card>
        ))}
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_23rem]">
        <Card className="p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[var(--foreground)]">
                {t.upcoming}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{t.upcomingHint}</p>
            </div>
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1 text-sm font-bold text-[var(--primary)]"
            >
              {t.viewAll} <ArrowRight className="size-4" />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="mt-8 grid justify-items-center gap-3 rounded-2xl bg-[var(--surface-muted)] py-10 text-center">
              <CircleDashed className="size-8 text-slate-300" />
              <p className="text-sm text-[var(--muted)]">{t.noTasks}</p>
            </div>
          ) : (
            <div className="mt-5 divide-y">
              {upcoming.map((task) => (
                <div
                  key={getId(task)}
                  className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${task.status === "done" ? "bg-emerald-500" : task.priority === "high" ? "bg-rose-500" : "bg-indigo-500"}`}
                  />
                  <div className="min-w-0 flex-1" dir="auto">
                    <p className="truncate text-sm font-bold text-[var(--foreground)]">
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {task.dueDate ? formatDate(task.dueDate, intlLocale) : t.noDueDate}
                    </p>
                  </div>
                  <Badge
                    className={
                      task.status === "done"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : task.status === "in-progress"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                          : "bg-slate-100 text-slate-600"
                    }
                  >
                    {task.status === "done"
                      ? t.done
                      : task.status === "in-progress"
                        ? t.inProgress
                        : t.todo}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden bg-[var(--navigation)] p-6 text-white">
          <h2 className="font-black text-white">{t.overall}</h2>
          <p className="mt-1 text-sm text-white/70">{t.overallHint}</p>
          <div
            className="relative mx-auto mt-8 grid size-44 place-items-center rounded-full bg-[conic-gradient(var(--highlight)_var(--progress),rgba(255,255,255,.1)_0)] p-4"
            style={{ "--progress": `${progress * 100}%` } as React.CSSProperties}
          >
            <div className="grid size-full place-items-center rounded-full bg-[var(--navigation)] text-center">
              <div>
                <p className="text-3xl font-black text-white">
                  {formatPercent(progress, intlLocale)}
                </p>
                <p className="mt-1 text-xs text-white/70">{t.completed}</p>
              </div>
            </div>
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white/7 p-2.5 text-white/70">
              <b className="block text-base text-white">
                {formatNumber(summary.todo, intlLocale)}
              </b>{" "}
              {t.remaining}
            </div>
            <div className="rounded-xl bg-[var(--primary)]/15 p-2.5 text-[var(--primary)]">
              <b className="block text-base">
                {formatNumber(summary.inProgress, intlLocale)}
              </b>{" "}
              {t.active}
            </div>
            <div className="rounded-xl bg-[var(--highlight)]/10 p-2.5 text-[var(--highlight)]">
              <b className="block text-base">{formatNumber(summary.done, intlLocale)}</b>{" "}
              {t.finished}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
