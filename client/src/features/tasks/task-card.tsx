"use client";

import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Edit3,
  ExternalLink,
  LoaderCircle,
  Paperclip,
  Trash2,
  UserRound,
} from "lucide-react";

import { Badge, Card } from "@/components/ui/card";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";
import { cn, formatDateTime, getId } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    status: { todo: "To do", "in-progress": "In progress", done: "Done" },
    priority: { low: "Low priority", medium: "Medium priority", high: "High priority" },
    edit: "Edit",
    delete: "Delete",
    noDescription: "No description has been added to this task.",
    noDueDate: "No due date",
    completedOn: "Completed on",
    overdue: "Overdue",
    quickStatus: "Quick status",
    setStatus: "Change status to",
    id: "ID",
  },
  de: {
    status: { todo: "Offen", "in-progress": "In Bearbeitung", done: "Erledigt" },
    priority: {
      low: "Niedrige Priorität",
      medium: "Mittlere Priorität",
      high: "Hohe Priorität",
    },
    edit: "Bearbeiten",
    delete: "Löschen",
    noDescription: "Für diese Aufgabe wurde keine Beschreibung hinterlegt.",
    noDueDate: "Kein Fälligkeitsdatum",
    completedOn: "Erledigt am",
    overdue: "Überfällig",
    quickStatus: "Schnellstatus",
    setStatus: "Status ändern zu",
    id: "ID",
  },
} as const;

const statusClasses: Record<TaskStatus, { className: string; icon: typeof Circle }> = {
  todo: { className: "bg-[var(--surface-muted)] text-[var(--muted)]", icon: Circle },
  "in-progress": {
    className: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    icon: Clock3,
  },
  done: {
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    icon: CheckCircle2,
  },
};

const priorityClasses: Record<TaskPriority, string> = {
  low: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  medium: "bg-[var(--primary-soft)] text-[var(--primary-dark)]",
  high: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

const quickStatusClasses: Record<TaskStatus, string> = {
  todo: "bg-[var(--surface)] text-[var(--foreground)] shadow-sm",
  "in-progress":
    "bg-amber-50 text-amber-700 shadow-sm dark:bg-amber-500/15 dark:text-amber-300",
  done: "bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-300",
};

const statusOrder: TaskStatus[] = ["todo", "in-progress", "done"];

export function TaskCard({
  task,
  showOwner,
  referenceTime,
  onEdit,
  onDelete,
  onStatusChange,
  statusUpdating,
}: {
  task: Task;
  showOwner?: boolean;
  referenceTime: number;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  statusUpdating?: boolean;
}) {
  const { locale, intlLocale } = usePreferences();
  const t = copy[locale];
  const status = statusClasses[task.status];
  const StatusIcon = status.icon;
  const owner = typeof task.owner === "object" ? task.owner : null;
  const overdue =
    task.status !== "done" &&
    task.dueDate &&
    new Date(task.dueDate).getTime() < referenceTime;

  return (
    <Card className="group relative flex min-h-72 flex-col overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/50 hover:shadow-[0_12px_0_color-mix(in_srgb,var(--foreground)_9%,transparent)]">
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1.5",
          task.priority === "high"
            ? "bg-rose-500"
            : task.priority === "medium"
              ? "bg-[var(--primary)]"
              : "bg-sky-500",
        )}
      />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge className={status.className}>
              <StatusIcon className="mr-1 size-3.5" />
              {t.status[task.status]}
            </Badge>
            <Badge className={priorityClasses[task.priority]}>
              {t.priority[task.priority]}
            </Badge>
          </div>
          <h3
            className="mt-4 line-clamp-2 text-lg leading-7 font-black tracking-tight text-[var(--foreground)]"
            dir="auto"
          >
            {task.title}
          </h3>
        </div>
        <div className="flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            onClick={onEdit}
            className="focus-ring grid size-9 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
            aria-label={`${t.edit}: ${task.title}`}
          >
            <Edit3 className="size-4" />
          </button>
          <button
            onClick={onDelete}
            className="focus-ring grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
            aria-label={`${t.delete}: ${task.title}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <p
        className="mt-3 line-clamp-3 flex-1 text-sm leading-7 text-[var(--muted)]"
        dir="auto"
      >
        {task.description || t.noDescription}
      </p>

      {onStatusChange && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between px-1 text-[10px] font-extrabold tracking-[.1em] text-[var(--muted)] uppercase">
            <span>{t.quickStatus}</span>
            {statusUpdating && (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            )}
          </div>
          <div
            className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--surface-muted)] p-1"
            role="group"
            aria-label={t.quickStatus}
            aria-busy={statusUpdating || undefined}
          >
            {statusOrder.map((nextStatus) => {
              const option = statusClasses[nextStatus];
              const OptionIcon = option.icon;
              const active = task.status === nextStatus;

              return (
                <button
                  key={nextStatus}
                  type="button"
                  onClick={() => onStatusChange(nextStatus)}
                  disabled={statusUpdating || active}
                  aria-pressed={active}
                  aria-label={`${t.setStatus}: ${t.status[nextStatus]}`}
                  className={cn(
                    "focus-ring flex min-w-0 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[11px] font-bold transition disabled:cursor-default",
                    active
                      ? quickStatusClasses[nextStatus]
                      : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
                  )}
                >
                  <OptionIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{t.status[nextStatus]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 space-y-2 border-t pt-4 text-xs text-[var(--muted)]">
        <div
          className={cn(
            "flex min-w-0 items-start gap-2",
            overdue && "font-bold text-rose-600 dark:text-rose-300",
          )}
        >
          <CalendarDays className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0">
            {task.dueDate ? (
              <time dateTime={task.dueDate}>
                {formatDateTime(task.dueDate, intlLocale)}
              </time>
            ) : (
              t.noDueDate
            )}
            {overdue && <span> · {t.overdue}</span>}
          </span>
        </div>
        {task.status === "done" && task.completedAt && (
          <div className="flex min-w-0 items-start gap-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">
              {t.completedOn}{" "}
              <time dateTime={task.completedAt}>
                {formatDateTime(task.completedAt, intlLocale)}
              </time>
            </span>
          </div>
        )}
        {showOwner && owner && (
          <div className="flex min-w-0 items-start gap-2">
            <UserRound className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="truncate font-bold text-[var(--foreground)]" dir="auto">
                {owner.firstName} {owner.lastName}
              </p>
              <p className="truncate text-[11px]" dir="ltr" title={owner.email}>
                {owner.email}
              </p>
            </div>
          </div>
        )}
        {task.attachment && (
          <a
            href={task.attachment.url}
            target="_blank"
            rel="noreferrer"
            className="focus-ring flex items-center gap-2 rounded text-[var(--primary)] hover:underline"
          >
            <Paperclip className="size-4" />
            <span className="max-w-48 truncate" dir="auto">
              {task.attachment.originalName}
            </span>
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      <span className="sr-only">
        {t.id}: {getId(task)}
      </span>
    </Card>
  );
}
