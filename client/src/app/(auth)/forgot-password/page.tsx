import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "Passwort vergessen" : "Forgot password" };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
