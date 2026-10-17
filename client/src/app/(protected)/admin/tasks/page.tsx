import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { TasksView } from "@/features/tasks/tasks-view";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "Alle Aufgaben" : "All tasks" };
}

export default function AdminTasksPage() {
  return (
    <Suspense
      fallback={<div className="h-96 animate-pulse rounded-2xl bg-[var(--surface)]" />}
    >
      <TasksView admin />
    </Suspense>
  );
}
