"use client";

import { CheckCircle2, Clock3, Headphones, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { PreferencesControls } from "@/components/preferences-controls";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    title: "Support that keeps every detail connected.",
    description:
      "Submit requests, follow response targets, and move seamlessly from AI guidance to a human agent.",
    today: "Live request queue",
    tasks: [
      "Cannot access billing history",
      "Invoice contains the wrong address",
      "Request export for account data",
    ],
    suggestion: "AI triage",
    suggestionText: "Categorize this as Billing and prepare it for the support team?",
    home: "Back to home",
  },
  de: {
    title: "Support, bei dem kein Detail verloren geht.",
    description:
      "Sende Anfragen, verfolge Reaktionsziele und wechsle nahtlos von KI-Hilfe zu einem Support-Agenten.",
    today: "Live-Anfragen",
    tasks: [
      "Kein Zugriff auf den Rechnungsverlauf",
      "Falsche Adresse auf der Rechnung",
      "Datenexport für das Konto anfragen",
    ],
    suggestion: "KI-Triage",
    suggestionText: "Als Abrechnung kategorisieren und für das Support-Team vorbereiten?",
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
      className="relative grid min-h-dvh overflow-hidden bg-[var(--background)] lg:grid-cols-[minmax(28rem,1.08fr)_minmax(30rem,.92fr)]"
    >
      <aside className="desk-grid-glow relative max-lg:hidden min-h-dvh overflow-hidden bg-[#0d1124] px-10 py-8 text-white lg:flex lg:flex-col xl:px-16">
        <div className="absolute -left-28 top-28 size-80 rounded-full bg-[#735ff2]/20 blur-3xl" />
        <div className="absolute -right-36 bottom-0 size-96 rounded-full bg-[#1aa9aa]/12 blur-3xl" />
        <div className="relative z-10">
          <Logo inverse />
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-10">
          <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.16em] text-white/50 uppercase">
            <span className="desk-live-dot" />
            {locale === "de" ? "Live Support Workspace" : "Live support workspace"}
          </p>
          <h1 className="mt-5 max-w-xl text-[clamp(2.7rem,4.8vw,4.75rem)] leading-[0.98] font-black tracking-[-0.065em]">
            {t.title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/58">
            {t.description}
          </p>
          <div className="mt-10 overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[.055] shadow-[0_30px_80px_rgb(0_0_0_/_0.28)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div>
                <p className="text-[10px] font-black tracking-[0.14em] text-white/35 uppercase">Karino Desk</p>
                <h2 className="mt-1 text-sm font-bold">{t.today}</h2>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-[11px] font-bold text-white/65">
                <Clock3 className="size-3.5 text-[#a99cff]" />
                10:36
              </div>
            </div>
            <div className="grid gap-3 p-4 xl:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="space-y-2.5">
              {t.tasks.map((task, index) => (
                <div
                  key={task}
                    className="group flex items-center gap-3 rounded-[1rem] border border-white/7 bg-white/[.045] p-3.5 transition hover:border-[#9a8cff]/35 hover:bg-white/[.075]"
                >
                  {index === 2 ? (
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
                        <CheckCircle2 className="size-4.5" />
                      </span>
                  ) : (
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#9a8cff]/12 text-[#b1a6ff]">
                        <Headphones className="size-4.5" />
                      </span>
                  )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{task}</p>
                      <p className="mt-1 text-[10px] font-semibold text-white/38">
                      {locale === "de" ? "SLA · Hohe Priorität" : "SLA · High priority"}
                    </p>
                  </div>
                </div>
              ))}
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="rounded-[1rem] border border-white/8 bg-white/5 p-3.5">
                  <ShieldCheck className="size-4 text-emerald-300" />
                  <p className="mt-3 text-[10px] font-black tracking-[0.1em] text-white/35 uppercase">SLA health</p>
                  <p className="mt-1 text-xl font-black tracking-[-0.04em]">94%</p>
                </div>
                <div className="flex-1 rounded-[1rem] bg-[linear-gradient(145deg,#735ff2,#5142ba)] p-3.5 shadow-[0_16px_36px_rgb(73_59_190_/_0.35)]">
                  <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.08em] uppercase">
                    <Sparkles className="size-3.5" />
                    {t.suggestion}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-white/75">{t.suggestionText}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section className="desk-grid-glow relative flex min-h-dvh flex-col px-4 py-4 sm:px-8 lg:px-10 xl:px-14">
        <div className="relative z-10 flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <PreferencesControls />
            <Link
              href="/"
              className="focus-ring rounded-[var(--control-radius)] px-3 py-2 text-xs font-bold text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            >
              {t.home}
            </Link>
          </div>
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-[36rem] flex-1 items-center py-8 lg:py-12">
          <div className="desk-panel w-full p-6 sm:p-8 lg:p-9">{children}</div>
        </div>
      </section>
    </main>
  );
}
