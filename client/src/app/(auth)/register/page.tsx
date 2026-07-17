import type { Metadata } from "next";
import { cookies } from "next/headers";

import { RegisterForm } from "@/features/auth/register-form";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "Konto erstellen" : "Create account" };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
