"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { PreferencesControls } from "@/components/preferences-controls";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    home: "Home",
    eyebrow: "Task management without the clutter",
    title: "Start every day with a clear plan.",
    description:
      "Tasks, priorities, profile images, and secure sessions—all together in one fast, simple workspace.",
    qualities: ["Secure", "Fast", "Responsive"],
  },
  de: {
    home: "Startseite",
    eyebrow: "Aufgaben verwalten, ohne Chaos",
    title: "Starte jeden Tag mit einem klaren Plan.",
    description:
      "Aufgaben, Prioritäten, Anhänge und sichere Sitzungen – vereint in einem schnellen, einfachen Arbeitsbereich.",
    qualities: ["Sicher", "Schnell", "Responsiv"],
  },
} as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { locale } = usePreferences();
  const t = copy[locale];

  return (
    <main className="grid min-h-screen bg-[var(--background)] lg:grid-cols-[1fr_1.05fr]">
      <section className="paper-grid flex min-h-screen flex-col px-4 py-6 sm:px-8 lg:px-14">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <PreferencesControls />
            <Link
              href="/"
              className="focus-ring inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">{t.home}</span>
            </Link>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-12">
          {children}
        </div>
      </section>
      <aside className="relative m-3 hidden overflow-hidden rounded-[var(--container-radius)] bg-[#171a18] p-14 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="paper-grid absolute inset-0 opacity-10" />
        <div className="absolute -left-24 -top-24 size-96 rounded-full bg-[var(--primary)]/35 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 size-96 rounded-full bg-[var(--highlight)]/15 blur-3xl" />
        <div className="relative max-w-xl">
          <span className="eyebrow text-[var(--highlight)]">{t.eyebrow}</span>
          <h2 className="mt-5 text-5xl leading-[1.02] font-black tracking-[-0.05em]">
            {t.title}
          </h2>
          <p className="mt-5 leading-8 text-slate-300">{t.description}</p>
          <div className="mt-10 grid grid-cols-3 gap-3 text-center">
            {t.qualities.map((item) => (
              <div
                key={item}
                className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4 font-bold"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}
