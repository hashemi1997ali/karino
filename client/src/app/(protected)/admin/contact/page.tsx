import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AuthReady } from "@/features/auth/auth-gate";
import {
  AdminContactView,
  AdminContactViewFallback,
} from "@/features/contact/admin-contact-view";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "Kontakt-Posteingang" : "Contact inbox" };
}

export default function AdminContactPage() {
  return (
    <AuthReady fallback={<AdminContactViewFallback />}>
      <AdminContactView />
    </AuthReady>
  );
}
