"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { LoadingState } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-provider";
import { usePreferences } from "@/providers/preferences-provider";

/**
 * Sends signed-out visitors to the login page. The shell and page render straight
 * away (requests wait for the session in apiRequest), so nothing remounts.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") {
      // Keep the query string too (e.g. a prompt typed on the landing page).
      const next = pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [status, pathname, router]);

  return children;
}

export function AdminGate({ children }: { children: ReactNode }) {
  const { status, isAdmin } = useAuth();
  const { locale } = usePreferences();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) router.replace("/dashboard");
  }, [status, isAdmin, router]);

  // Only a confirmed non-admin is held here until redirected.
  if (status === "authenticated" && !isAdmin) {
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
