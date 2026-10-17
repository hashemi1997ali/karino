import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "Passwort zurücksetzen" : "Reset password" };
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
