"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePreferences } from "@/providers/preferences-provider";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { locale } = usePreferences();
  const text =
    locale === "de"
      ? {
          title: "Etwas ist schiefgelaufen",
          description:
            "Diese Seite konnte nicht geladen werden. Bitte versuche es erneut.",
          action: "Erneut versuchen",
        }
      : {
          title: "Something went wrong",
          description: "We could not load this page. Please try again.",
          action: "Try again",
        };
  return (
    <main className="grid min-h-[70dvh] place-items-center p-6 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-rose-50 text-[var(--danger)] dark:bg-rose-500/15">
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">{text.title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{text.description}</p>
        <Button className="mt-6" onClick={reset}>
          {text.action}
        </Button>
      </div>
    </main>
  );
}
