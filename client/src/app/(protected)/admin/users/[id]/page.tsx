import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AdminUserDetailView } from "@/features/admin/admin-user-detail-view";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "Benutzerprofil" : "User profile" };
}

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminUserDetailView userId={id} />;
}
