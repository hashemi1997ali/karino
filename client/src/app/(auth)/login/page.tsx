import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/login-form";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  return { title: locale === "de" ? "Anmelden" : "Log in" };
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-[var(--surface-muted)]" />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
