import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AccountView } from "@/features/account/account-view";
import { LOCALE_COOKIE_NAME, parseLocale, type Locale } from "@/lib/preferences";

const copy = {
  en: { title: "Account" },
  de: { title: "Konto" },
} as const satisfies Record<Locale, { title: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  return { title: copy[locale].title };
}

export default function AccountPage() {
  return <AccountView />;
}
