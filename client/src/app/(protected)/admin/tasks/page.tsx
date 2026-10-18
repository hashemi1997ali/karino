import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { AuthReady } from "@/features/auth/auth-gate";
import { TasksView, TasksViewFallback } from "@/features/tasks/tasks-view";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "Alle Aufgaben" : "All tasks" };
}

export default function AdminTasksPage() {
  return (
    <AuthReady fallback={<TasksViewFallback admin />}>
      <Suspense fallback={<TasksViewFallback admin />}>
        <TasksView admin />
      </Suspense>
    </AuthReady>
  );
}
