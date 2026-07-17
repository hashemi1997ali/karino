import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AdminUsersView } from "@/features/admin/admin-users-view";
import { LOCALE_COOKIE_NAME, parseLocale, type Locale } from "@/lib/preferences";

const copy = {
  en: { title: "User administration" },
  de: { title: "Benutzerverwaltung" },
} as const satisfies Record<Locale, { title: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  return { title: copy[locale].title };
}

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
