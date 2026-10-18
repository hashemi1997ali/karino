import type { Metadata } from "next";
import { cookies } from "next/headers";

import { StaffSupportView } from "@/features/chat/staff-support-view";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "Support-Posteingang" : "Support inbox" };
}

export default function SupportPage() {
  return <StaffSupportView />;
}
