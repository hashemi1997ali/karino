"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { LoadingState } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-provider";
import { usePreferences } from "@/providers/preferences-provider";

/**
 * Sends signed-out visitors to the login page. The shell renders straight
 * away so the tree never swaps; each page waits for the session via AuthReady.
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

  // While the session is still loading, the page's AuthReady shows its own
  // placeholder; only a confirmed non-admin is held here until redirected.
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

/**
 * Renders the page once the session is restored. Until then the page shows
 * `fallback` (its real heading plus a skeleton) inside the shell placeholder.
 */
export function AuthReady({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const { status } = useAuth();
  return status === "authenticated" ? children : fallback;
}
