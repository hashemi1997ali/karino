import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AuthReady } from "@/features/auth/auth-gate";
import {
  AdminOverviewView,
  AdminOverviewViewFallback,
} from "@/features/admin/admin-overview-view";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "Admin-Übersicht" : "Admin overview" };
}

export default function AdminOverviewPage() {
  return (
    <AuthReady fallback={<AdminOverviewViewFallback />}>
      <AdminOverviewView />
    </AuthReady>
  );
}
