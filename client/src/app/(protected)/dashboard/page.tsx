import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AuthReady } from "@/features/auth/auth-gate";
import {
  DashboardView,
  DashboardViewFallback,
} from "@/features/dashboard/dashboard-view";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "Heute" : "Today" };
}

export default function DashboardPage() {
  return (
    <AuthReady fallback={<DashboardViewFallback />}>
      <DashboardView />
    </AuthReady>
  );
}
