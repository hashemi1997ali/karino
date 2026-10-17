import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
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
        <div className="grid w-full gap-5" aria-hidden="true">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
