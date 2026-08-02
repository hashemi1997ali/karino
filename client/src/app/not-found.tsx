"use client";

import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { buttonClassName } from "@/components/ui/button";
import { usePreferences } from "@/providers/preferences-provider";

export default function NotFound() {
  const { locale } = usePreferences();
  const text =
    locale === "de"
      ? {
          title: "Seite nicht gefunden",
          description:
            "Die Seite wurde möglicherweise verschoben oder existiert nicht mehr.",
          action: "Zu Heute",
        }
      : {
          title: "Page not found",
          description: "The page may have moved or no longer exists.",
          action: "Go to Today",
        };
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--background)] p-6 text-center">
      <div>
        <Logo compact />
        <span className="mx-auto mt-10 grid size-14 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
          <FileQuestion className="size-6" />
        </span>
        <p className="mt-5 text-sm font-semibold text-[var(--primary)]">404</p>
        <h1 className="mt-1 text-2xl font-bold">{text.title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{text.description}</p>
        <Link href="/dashboard" className={buttonClassName({ className: "mt-6" })}>
          {text.action}
        </Link>
      </div>
    </main>
  );
}
