"use client";

import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { PreferencesControls } from "@/components/preferences-controls";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    title: "Everything you need to stay organized.",
    description:
      "Plan tasks, track progress and get help from your personal AI assistant.",
    today: "Today",
    tasks: ["Ship the landing page", "Reply to support", "Plan next sprint"],
    suggestion: "AI suggestion",
    suggestionText: "Reschedule two overdue tasks?",
    home: "Back to home",
  },
  de: {
    title: "Alles, was du brauchst, um organisiert zu bleiben.",
    description:
      "Plane Aufgaben, verfolge Fortschritte und nutze deinen persönlichen KI-Assistenten.",
    today: "Heute",
    tasks: ["Landingpage veröffentlichen", "Support antworten", "Sprint planen"],
    suggestion: "KI-Vorschlag",
    suggestionText: "Zwei überfällige Aufgaben neu planen?",
    home: "Zur Startseite",
  },
} as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { locale } = usePreferences();
  const t = copy[locale];

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="grid min-h-dvh bg-[var(--background)] lg:grid-cols-2"
    >
      <aside className="max-lg:hidden min-h-dvh flex-col bg-[#15151f] px-10 py-10 text-white lg:flex xl:px-16">
        <Logo inverse />
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-12">
          <h1 className="max-w-lg text-4xl leading-[1.15] font-bold tracking-[-0.035em]">
            {t.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/70">
            {t.description}
          </p>
          <div className="mt-12 rounded-[var(--container-radius)] border border-white/15 bg-white/[.055] p-5">
            <h2 className="font-semibold">{t.today}</h2>
            <div className="mt-5 space-y-3">
              {t.tasks.map((task, index) => (
                <div
                  key={task}
                  className="flex items-center gap-3 rounded-[var(--control-radius)] bg-white/[.055] p-3.5"
                >
                  {index === 2 ? (
                    <CheckCircle2 className="size-5 text-[var(--primary)]" />
                  ) : (
                    <Circle className="size-5 text-white/75" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">{task}</p>
                    <p className="mt-1 text-xs text-white/55">Today · High priority</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 ml-auto max-w-60 rounded-[var(--control-radius)] bg-[var(--primary)] p-4">
              <p className="flex items-center gap-2 text-xs font-semibold">
                <Sparkles className="size-4" />
                {t.suggestion}
              </p>
              <p className="mt-2 text-xs text-white/80">{t.suggestionText}</p>
            </div>
          </div>
        </div>
      </aside>

      <section className="flex min-h-dvh flex-col px-4 py-5 sm:px-8 lg:px-14">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <PreferencesControls />
            <Link
              href="/"
              className="focus-ring rounded-[var(--control-radius)] px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            >
              {t.home}
            </Link>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-lg flex-1 items-center py-10">
          {children}
        </div>
      </section>
    </main>
  );
}
