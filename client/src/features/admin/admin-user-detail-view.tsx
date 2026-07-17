"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CheckSquare2,
  Monitor,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { Badge, Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { getUserRequest } from "@/features/admin/api";
import { getTasksRequest } from "@/features/tasks/api";
import { getErrorMessage } from "@/lib/api-error";
import {
  getBanReasonLabel,
  getTaskPriorityLabel,
  getTaskStatusLabel,
  getUserRoleLabel,
} from "@/lib/domain-labels";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    back: "Back to users",
    profile: "User profile",
    tasks: "User tasks",
    tasksHeading: (name: string) => `${name}'s tasks`,
    taskCount: "Tasks",
    sessions: "Active sessions",
    joined: "Joined",
    status: "Account status",
    active: "Active",
    banned: "Banned",
    noTasks: "This user has no tasks yet.",
    loading: "Loading user profile…",
    due: "Due",
  },
  de: {
    back: "Zurück zu Benutzern",
    profile: "Benutzerprofil",
    tasks: "Aufgaben des Benutzers",
    tasksHeading: (name: string) => `Aufgaben von ${name}`,
    taskCount: "Aufgaben",
    sessions: "Aktive Sitzungen",
    joined: "Registriert",
    status: "Kontostatus",
    active: "Aktiv",
    banned: "Gesperrt",
    noTasks: "Dieser Benutzer hat noch keine Aufgaben.",
    loading: "Benutzerprofil wird geladen…",
    due: "Fällig",
  },
} as const;

export function AdminUserDetailView({ userId }: { userId: string }) {
  const { locale, intlLocale } = usePreferences();
  const t = copy[locale];
  const userQuery = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => getUserRequest(userId),
  });
  const tasksQuery = useQuery({
    queryKey: ["admin", "tasks", "owner", userId],
    queryFn: () => getTasksRequest({ page: 1, limit: 50, ownerId: userId }, true),
  });

  if (userQuery.isPending) return <LoadingState label={t.loading} />;
  if (userQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(userQuery.error, locale)}
        retry={() => void userQuery.refetch()}
      />
    );
  }

  const { user, stats } = userQuery.data;
  const tasks = tasksQuery.data?.tasks ?? [];
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }).format(new Date(value));

  return (
    <div>
      <Link
        href="/admin/users"
        className="focus-ring inline-flex items-center gap-2 rounded-full text-sm font-bold text-[var(--muted)] hover:text-[var(--primary)]"
      >
        <ArrowLeft className="size-4" />
        {t.back}
      </Link>

      <div className="mt-6 grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="h-fit p-5">
          <span className="grid size-16 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
            <UserRound className="size-7" />
          </span>
          <p className="mt-4 text-xs font-black tracking-[.12em] text-[var(--primary)] uppercase">
            {t.profile}
          </p>
          <h1 className="mt-1 text-2xl font-black">
            {user.firstName} {user.lastName}
          </h1>
          <p className="mt-1 break-all text-sm text-[var(--muted)]">{user.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <Badge key={role}>{getUserRoleLabel(role, locale)}</Badge>
            ))}
          </div>
          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-[var(--muted)]">
                <CheckSquare2 className="size-4" />
                {t.taskCount}
              </dt>
              <dd className="font-black">{stats.taskCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-[var(--muted)]">
                <Monitor className="size-4" />
                {t.sessions}
              </dt>
              <dd className="font-black">{stats.activeSessionCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-[var(--muted)]">
                <Calendar className="size-4" />
                {t.joined}
              </dt>
              <dd className="font-black">{formatDate(user.createdAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-[var(--muted)]">
                <ShieldCheck className="size-4" />
                {t.status}
              </dt>
              <dd
                className={
                  user.ban?.isBanned
                    ? "font-black text-rose-600"
                    : "font-black text-emerald-600"
                }
              >
                {user.ban?.isBanned
                  ? `${t.banned}: ${getBanReasonLabel(user.ban.reason, locale)}`
                  : t.active}
              </dd>
            </div>
          </dl>
        </Card>

        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-[var(--primary)]">{t.tasks}</p>
              <h2 className="mt-2 text-2xl font-black">
                {t.tasksHeading(user.firstName)}
              </h2>
            </div>
            <Badge>{tasks.length}</Badge>
          </div>

          {tasksQuery.isPending ? (
            <div className="mt-5">
              <LoadingState label={t.tasks} />
            </div>
          ) : tasksQuery.isError ? (
            <div className="mt-5">
              <ErrorState
                message={getErrorMessage(tasksQuery.error, locale)}
                retry={() => void tasksQuery.refetch()}
              />
            </div>
          ) : tasks.length === 0 ? (
            <Card className="mt-5 p-8 text-center text-sm text-[var(--muted)]">
              {t.noTasks}
            </Card>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {tasks.map((task) => (
                <Card key={task.id ?? task._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-black" dir="auto">
                      {task.title}
                    </h3>
                    <Badge>{getTaskStatusLabel(task.status, locale)}</Badge>
                  </div>
                  <p
                    className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]"
                    dir="auto"
                  >
                    {task.description || "—"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <Badge>{getTaskPriorityLabel(task.priority, locale)}</Badge>
                    {task.dueDate && (
                      <Badge>
                        {t.due}: {formatDate(task.dueDate)}
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
