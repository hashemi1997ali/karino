"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { LoadingState } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-provider";
import { usePreferences } from "@/providers/preferences-provider";

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { locale } = usePreferences();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);

  if (status !== "authenticated") {
    return (
      <main id="main-content" tabIndex={-1} className="grid min-h-dvh place-items-center">
        <LoadingState
          label={
            locale === "de" ? "Deine Sitzung wird geprüft …" : "Checking your session …"
          }
        />
      </main>
    );
  }

  return children;
}

export function AdminGate({ children }: { children: ReactNode }) {
  const { status, isAdmin } = useAuth();
  const { locale } = usePreferences();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) router.replace("/dashboard");
  }, [status, isAdmin, router]);

  if (status !== "authenticated" || !isAdmin) {
    return (
      <LoadingState
        label={
          locale === "de"
            ? "Administratorzugriff wird geprüft …"
            : "Checking administrator access …"
        }
      />
    );
  }

  return children;
}
