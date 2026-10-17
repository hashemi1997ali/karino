import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ContactView } from "@/features/contact/contact-view";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "Kontakt" : "Contact" };
}

export default function ContactPage() {
  return <ContactView />;
}
