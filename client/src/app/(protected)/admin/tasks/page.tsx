import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { TaskManager } from "@/features/tasks/task-manager";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "Aufgabenverwaltung" : "Task administration" };
}

export default function AdminTasksPage() {
  return (
    <Suspense
      fallback={<div className="h-96 animate-pulse rounded-2xl bg-[var(--surface)]" />}
    >
      <TaskManager admin />
    </Suspense>
  );
}
