"use client";

import { ErrorState } from "@/components/ui/states";
import { usePreferences } from "@/providers/preferences-provider";

// Rendered inside the protected layout, so a crashing page keeps the sidebar
// and navigation instead of replacing the whole app with the root error page.
export default function ProtectedError({ reset }: { error: Error; reset: () => void }) {
  const { locale } = usePreferences();
  return (
    <ErrorState
      message={
        locale === "de"
          ? "Diese Seite konnte nicht geladen werden. Bitte versuche es erneut."
          : "We could not load this page. Please try again."
      }
      retry={reset}
    />
  );
}
