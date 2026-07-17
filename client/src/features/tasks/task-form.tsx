"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp, Paperclip, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { createTaskFormSchema, type TaskFormValues } from "@/features/tasks/schemas";
import type { Task } from "@/lib/types";
import { toLocalDateTimeInput } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    fileTooLarge: "The file cannot exceed 5 MB.",
    title: "Task title",
    titlePlaceholder: "For example, finish the dashboard",
    description: "Description",
    descriptionPlaceholder: "Add the details needed to complete this task …",
    status: "Status",
    todo: "To do",
    inProgress: "In progress",
    done: "Done",
    priority: "Priority",
    low: "Low",
    medium: "Medium",
    high: "High",
    dueDate: "Due date",
    removeAttachment: "Remove current attachment",
    replaceAttachment: "Replace attachment",
    optionalAttachment: "Optional attachment",
    attachmentHint: "Maximum file size: 5 MB.",
    chooseFile: "Choose a file",
    save: "Save changes",
    create: "Create task",
  },
  de: {
    fileTooLarge: "Die Datei darf höchstens 5 MB groß sein.",
    title: "Aufgabentitel",
    titlePlaceholder: "Zum Beispiel: Dashboard fertigstellen",
    description: "Beschreibung",
    descriptionPlaceholder: "Ergänze alle Details, die du für diese Aufgabe brauchst …",
    status: "Status",
    todo: "Offen",
    inProgress: "In Bearbeitung",
    done: "Erledigt",
    priority: "Priorität",
    low: "Niedrig",
    medium: "Mittel",
    high: "Hoch",
    dueDate: "Fällig am",
    removeAttachment: "Aktuellen Anhang entfernen",
    replaceAttachment: "Anhang ersetzen",
    optionalAttachment: "Optionaler Anhang",
    attachmentHint: "Maximale Dateigröße: 5 MB.",
    chooseFile: "Datei auswählen",
    save: "Änderungen speichern",
    create: "Aufgabe erstellen",
  },
} as const;

export function TaskForm({
  task,
  loading,
  removingAttachment,
  onSubmit,
  onRemoveAttachment,
}: {
  task?: Task | null;
  loading?: boolean;
  removingAttachment?: boolean;
  onSubmit: (data: FormData) => void | Promise<void>;
  onRemoveAttachment?: () => void | Promise<void>;
}) {
  const { locale } = usePreferences();
  const t = copy[locale];
  const schema = useMemo(() => createTaskFormSchema(locale), [locale]);
  const [file, setFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: task?.status ?? "todo",
      priority: task?.priority ?? "medium",
      dueDate: toLocalDateTimeInput(task?.dueDate),
    },
  });

  useEffect(() => {
    clearErrors();
  }, [locale, clearErrors]);

  const submit = handleSubmit(async (values) => {
    if (file && file.size > 5 * 1024 * 1024) {
      setError("root", { message: t.fileTooLarge });
      return;
    }

    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("description", values.description);
    formData.set("status", values.status);
    formData.set("priority", values.priority);
    if (values.dueDate) formData.set("dueDate", new Date(values.dueDate).toISOString());
    else if (task) formData.set("dueDate", "");
    if (file) formData.set("attachment", file);
    await onSubmit(formData);
  });

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <Field label={t.title} error={errors.title?.message}>
        <Input placeholder={t.titlePlaceholder} autoFocus {...register("title")} />
      </Field>
      <Field label={t.description} error={errors.description?.message}>
        <Textarea placeholder={t.descriptionPlaceholder} {...register("description")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.status} error={errors.status?.message}>
          <Select {...register("status")}>
            <option value="todo">{t.todo}</option>
            <option value="in-progress">{t.inProgress}</option>
            <option value="done">{t.done}</option>
          </Select>
        </Field>
        <Field label={t.priority} error={errors.priority?.message}>
          <Select {...register("priority")}>
            <option value="low">{t.low}</option>
            <option value="medium">{t.medium}</option>
            <option value="high">{t.high}</option>
          </Select>
        </Field>
      </div>
      <Field label={t.dueDate} error={errors.dueDate?.message}>
        <Input type="datetime-local" dir="ltr" {...register("dueDate")} />
      </Field>

      {task?.attachment && (
        <div className="flex items-center gap-3 rounded-xl border bg-[var(--surface-muted)] p-3">
          <Paperclip className="size-5 shrink-0 text-indigo-500" />
          <a
            href={task.attachment.url}
            target="_blank"
            rel="noreferrer"
            dir="auto"
            className="min-w-0 flex-1 truncate text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
          >
            {task.attachment.originalName}
          </a>
          {onRemoveAttachment && (
            <Button
              type="button"
              variant="danger"
              size="icon"
              loading={removingAttachment}
              onClick={onRemoveAttachment}
              aria-label={t.removeAttachment}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      )}

      <Field
        label={task?.attachment ? t.replaceAttachment : t.optionalAttachment}
        hint={t.attachmentHint}
        controlId="task-attachment"
      >
        <label
          htmlFor="task-attachment"
          className="focus-ring flex min-h-20 items-center justify-center gap-3 rounded-xl border border-dashed bg-[var(--surface-muted)] px-4 text-sm text-[var(--muted)] hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
        >
          <FileUp className="size-5 text-indigo-500" />
          <span className="truncate" dir="auto">
            {file?.name ?? t.chooseFile}
          </span>
          <input
            id="task-attachment"
            type="file"
            className="sr-only"
            aria-describedby="task-attachment-description"
            accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </Field>
      {errors.root?.message && (
        <p className="text-sm text-rose-600 dark:text-rose-300" role="alert">
          {errors.root.message}
        </p>
      )}
      <div className="mt-2 flex justify-end">
        <Button type="submit" loading={loading} className="min-w-32">
          {task ? t.save : t.create}
        </Button>
      </div>
    </form>
  );
}
