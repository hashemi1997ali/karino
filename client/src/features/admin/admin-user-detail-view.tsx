"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CheckSquare2,
  ExternalLink,
  Monitor,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState, LoadingState } from "@/components/ui/states";
import {
  deleteUserTaskAttachmentRequest,
  deleteUserTaskRequest,
  getUserRequest,
  getUserTasksRequest,
  updateUserTaskRequest,
} from "@/features/admin/api";
import { useAuth } from "@/features/auth/auth-provider";
import { TaskForm } from "@/features/tasks/task-form";
import { getErrorMessage } from "@/lib/api-error";
import {
  getBanReasonLabel,
  getTaskPriorityLabel,
  getTaskStatusLabel,
  getUserRoleLabel,
} from "@/lib/domain-labels";
import type { Task } from "@/lib/types";
import { getId } from "@/lib/utils";
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
    banIps: "Session IPs linked to this ban",
    noBanIps: "No matching session document currently exists.",
    noTasks: "This user has no tasks yet.",
    loading: "Loading user profile…",
    due: "Due",
    completed: "Completed",
    created: "Created",
    updated: "Updated",
    attachment: "Attachment",
    edit: "Edit task",
    delete: "Delete task",
    deleteTitle: "Delete this user's task?",
    deleteDescription: "This action permanently deletes the selected task.",
    saved: "Task updated.",
    deleted: "Task deleted.",
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
    banIps: "Mit dieser Sperre verknüpfte Sitzungs-IPs",
    noBanIps: "Derzeit existiert kein passendes Sitzungsdokument.",
    noTasks: "Dieser Benutzer hat noch keine Aufgaben.",
    loading: "Benutzerprofil wird geladen…",
    due: "Fällig",
    completed: "Erledigt",
    created: "Erstellt",
    updated: "Aktualisiert",
    attachment: "Anhang",
    edit: "Aufgabe bearbeiten",
    delete: "Aufgabe löschen",
    deleteTitle: "Diese Benutzeraufgabe löschen?",
    deleteDescription: "Die ausgewählte Aufgabe wird dauerhaft gelöscht.",
    saved: "Aufgabe aktualisiert.",
    deleted: "Aufgabe gelöscht.",
  },
} as const;

export function AdminUserDetailView({ userId }: { userId: string }) {
  const { locale, intlLocale } = usePreferences();
  const t = copy[locale];
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const userQuery = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => getUserRequest(userId),
  });
  const tasksQuery = useQuery({
    queryKey: ["admin", "user", userId, "tasks"],
    queryFn: () => getUserTasksRequest(userId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ taskId, formData }: { taskId: string; formData: FormData }) =>
      updateUserTaskRequest(userId, taskId, formData),
    onSuccess: async () => {
      setEditingTask(null);
      toast.success(t.saved);
      await queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });
  const removeAttachmentMutation = useMutation({
    mutationFn: (taskId: string) => deleteUserTaskAttachmentRequest(userId, taskId),
    onSuccess: async (task) => {
      setEditingTask(task);
      await queryClient.invalidateQueries({
        queryKey: ["admin", "user", userId, "tasks"],
      });
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });
  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => deleteUserTaskRequest(userId, taskId),
    onSuccess: async () => {
      setDeletingTask(null);
      toast.success(t.deleted);
      await queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
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
  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(intlLocale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : "—";

  return (
    <div>
      <Link
        href="/admin/users"
        className="focus-ring inline-flex items-center gap-2 rounded-full text-sm font-bold text-[var(--muted)] hover:text-[var(--primary)]"
      >
        <ArrowLeft className="size-4" />
        {t.back}
      </Link>

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
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
                <CheckSquare2 className="size-4" /> {t.taskCount}
              </dt>
              <dd className="font-black">{stats.taskCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-[var(--muted)]">
                <Monitor className="size-4" /> {t.sessions}
              </dt>
              <dd className="font-black">{stats.activeSessionCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-[var(--muted)]">
                <Calendar className="size-4" /> {t.joined}
              </dt>
              <dd className="min-w-0 text-right font-black break-words">
                {formatDate(user.createdAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-[var(--muted)]">
                <ShieldCheck className="size-4" /> {t.status}
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
          {user.ban?.isBanned && (
            <div className="mt-5 rounded-2xl border bg-[var(--surface-muted)] p-3">
              <p className="text-xs font-black">{t.banIps}</p>
              {user.ban.sessionIps.length > 0 ? (
                <ul className="mt-2 space-y-1 font-mono text-xs">
                  {user.ban.sessionIps.map((ip) => (
                    <li key={ip}>{ip}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-[var(--muted)]">{t.noBanIps}</p>
              )}
            </div>
          )}
        </Card>

        <div id="tasks" className="min-w-0 scroll-mt-6">
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
            <div className="mt-5 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-3">
              {tasks.map((task) => {
                const taskId = getId(task);
                return (
                  <Card key={taskId} className="min-w-0 overflow-hidden p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 break-words font-black" dir="auto">
                        {task.title}
                      </h3>
                      <Badge className="shrink-0">
                        {getTaskStatusLabel(task.status, locale)}
                      </Badge>
                    </div>
                    <p
                      className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--muted)]"
                      dir="auto"
                    >
                      {task.description || "—"}
                    </p>
                    <dl className="mt-4 grid gap-2 text-xs text-[var(--muted)]">
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3">
                        <dt>{getTaskPriorityLabel(task.priority, locale)}</dt>
                        <dd className="text-right break-words">
                          {t.due}: {formatDate(task.dueDate)}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3">
                        <dt>{t.created}</dt>
                        <dd className="text-right break-words">{formatDate(task.createdAt)}</dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3">
                        <dt>{t.updated}</dt>
                        <dd className="text-right break-words">{formatDate(task.updatedAt)}</dd>
                      </div>
                      {task.completedAt && (
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3">
                          <dt>{t.completed}</dt>
                          <dd className="text-right break-words">
                            {formatDate(task.completedAt)}
                          </dd>
                        </div>
                      )}
                    </dl>
                    {task.attachment && (
                      <a
                        href={task.attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="focus-ring mt-4 flex items-center gap-2 rounded-xl border p-2 text-xs font-bold hover:border-[var(--primary)]"
                      >
                        <ExternalLink className="size-4" />
                        <span className="min-w-0 flex-1 truncate">
                          {task.attachment.originalName}
                        </span>
                      </a>
                    )}
                    {isSuperAdmin && (
                      <div className="mt-4 grid gap-2 border-t pt-3 2xl:grid-cols-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full min-w-0 rounded-full px-2"
                          onClick={() => setEditingTask(task)}
                        >
                          <Pencil className="size-4" /> {t.edit}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="w-full min-w-0 rounded-full px-2"
                          onClick={() => setDeletingTask(task)}
                        >
                          <Trash2 className="size-4" /> {t.delete}
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(editingTask)}
        onOpenChange={(open) => !open && setEditingTask(null)}
        title={t.edit}
      >
        {editingTask && (
          <TaskForm
            key={`${getId(editingTask)}-${editingTask.updatedAt}`}
            task={editingTask}
            loading={updateMutation.isPending}
            removingAttachment={removeAttachmentMutation.isPending}
            onSubmit={(formData) =>
              updateMutation.mutate({ taskId: getId(editingTask), formData })
            }
            onRemoveAttachment={() => removeAttachmentMutation.mutate(getId(editingTask))}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deletingTask)}
        onOpenChange={(open) => !open && setDeletingTask(null)}
        title={t.deleteTitle}
        description={t.deleteDescription}
        confirmLabel={t.delete}
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingTask) deleteMutation.mutate(getId(deletingTask));
        }}
      />
    </div>
  );
}
