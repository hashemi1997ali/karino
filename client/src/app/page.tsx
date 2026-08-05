"use client";

import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Circle,
  Layers3,
  LockKeyhole,
  Paperclip,
  TimerReset,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { PublicHeader } from "@/components/marketing/public-header";
import { buttonClassName } from "@/components/ui/button";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    heroEyebrow: "AI-powered productivity workspace",
    heroTitle: "Stay focused.",
    heroAccent: "Karino handles the rest.",
    heroDescription:
      "Karino keeps your tasks, deadlines, and progress in one focused workspace—simple enough for today, powerful enough for every day.",
    start: "Start for free",
    viewTasks: "Explore features",
    benefits: ["Free to start", "Private by design", "Ready on every screen"],
    live: "Live workspace",
    today: "Tuesday, July 16",
    focus: "Today’s focus",
    focusCount: "3 of 5 tasks",
    streak: "2 day streak",
    demoTasks: [
      { title: "Shape the product story", meta: "09:30 · High", done: true },
      { title: "Review the API handoff", meta: "13:00 · Medium", done: false },
      { title: "Plan tomorrow’s sprint", meta: "16:30 · Low", done: false },
    ],
    deepWork: "Focus session",
    deepWorkTime: "42 min",
    weekly: "This week",
    weeklyValue: "76%",
    featuresEyebrow: "Your day, designed better",
    featuresTitle: "Everything useful. Nothing noisy.",
    featuresDescription:
      "A focused toolkit that helps you decide what matters, act on it, and see the progress you made.",
    features: [
      {
        title: "Plan with context",
        description: "Priorities, due dates, and status stay connected to every task.",
      },
      {
        title: "See momentum",
        description: "A clean dashboard turns daily work into visible progress.",
      },
      {
        title: "Stay in control",
        description: "Secure sessions let you review and revoke device access anytime.",
      },
    ],
    workflowEyebrow: "A tiny ritual that works",
    workflowTitle: "Capture. Focus. Finish.",
    workflowDescription:
      "Karino stays out of your way. Add the work, pick the next meaningful step, and close the day with a clear picture of what moved forward.",
    steps: [
      "Capture what is on your mind",
      "Choose the work that matters now",
      "Finish with visible progress",
    ],
    securityTitle: "Security that stays out of your way.",
    securityDescription:
      "Review active devices, revoke individual sessions, or sign out everywhere without weakening your everyday workflow.",
    securityItems: ["Secure sessions", "Device management", "Remote sign-out"],
    footer: "Made for clearer days and quieter minds.",
    contact: "Contact",
  },
  de: {
    heroEyebrow: "Entspannter Dinge erledigen",
    heroTitle: "Mach aus einem vollen Kopf",
    heroAccent: "einen klaren Tag.",
    heroDescription:
      "Karino bündelt Aufgaben, Termine und Fortschritt in einem fokussierten Arbeitsbereich – einfach für heute, stark für jeden Tag.",
    start: "Planung starten",
    viewTasks: "Arbeitsbereich öffnen",
    benefits: ["Kostenlos starten", "Privat by Design", "Für jeden Bildschirm"],
    live: "Live-Arbeitsbereich",
    today: "Dienstag, 16. Juli",
    focus: "Fokus für heute",
    focusCount: "3 von 5 Aufgaben",
    streak: "2 Tage in Folge",
    demoTasks: [
      { title: "Produktstory ausarbeiten", meta: "09:30 · Hoch", done: true },
      { title: "API-Übergabe prüfen", meta: "13:00 · Mittel", done: false },
      { title: "Sprint für morgen planen", meta: "16:30 · Niedrig", done: false },
    ],
    deepWork: "Fokus-Session",
    deepWorkTime: "42 Min.",
    weekly: "Diese Woche",
    weeklyValue: "76 %",
    featuresEyebrow: "Dein Tag, besser gestaltet",
    featuresTitle: "Alles Nützliche. Kein Lärm.",
    featuresDescription:
      "Ein fokussiertes Toolkit, das dir hilft, Wichtiges zu erkennen, umzusetzen und Fortschritt sichtbar zu machen.",
    features: [
      {
        title: "Mit Kontext planen",
        description:
          "Priorität, Termine, Status und Dateien bleiben direkt bei der Aufgabe.",
      },
      {
        title: "Fortschritt sehen",
        description: "Ein klares Dashboard macht deine tägliche Entwicklung sichtbar.",
      },
      {
        title: "Kontrolle behalten",
        description:
          "Sichere Sitzungen zeigen Gerätezugriffe und lassen sie jederzeit beenden.",
      },
    ],
    workflowEyebrow: "Ein kleines Ritual, das funktioniert",
    workflowTitle: "Erfassen. Fokussieren. Erledigen.",
    workflowDescription:
      "Karino bleibt im Hintergrund. Notiere die Arbeit, wähle den nächsten sinnvollen Schritt und beende den Tag mit einem klaren Blick auf deinen Fortschritt.",
    steps: [
      "Gedanken und Aufgaben erfassen",
      "Jetzt Wichtiges auswählen",
      "Mit sichtbarem Fortschritt abschließen",
    ],
    securityTitle: "Sicherheit, die nicht im Weg steht.",
    securityDescription:
      "Prüfe aktive Geräte, widerrufe einzelne Sitzungen oder melde dich überall ab – ohne deinen Arbeitsfluss zu stören.",
    securityItems: ["Sichere Sitzungen", "Geräteverwaltung", "Remote-Abmeldung"],
    footer: "Für klarere Tage und ruhigere Gedanken gemacht.",
    contact: "Kontakt",
  },
} as const;

const featureIcons = [Layers3, BarChart3, LockKeyhole] as const;

export default function HomePage() {
  const { locale } = usePreferences();
  const t = copy[locale];

  return (
    <div className="min-h-dvh overflow-hidden">
      <PublicHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="border-b">
          <div className="mx-auto grid max-w-[78rem] items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:px-8">
            <div>
              <span className="inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-2 text-xs font-semibold text-[var(--primary)]">
                {t.heroEyebrow}
              </span>
              <h1 className="text-balance mt-7 max-w-2xl text-4xl leading-[1.08] font-bold tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl">
                {t.heroTitle} <span>{t.heroAccent}</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
                {t.heroDescription}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className={buttonClassName({ size: "md" })}>
                  {t.start}
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="#features"
                  className={buttonClassName({ variant: "secondary", size: "md" })}
                >
                  {t.viewTasks}
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[var(--muted)]">
                {t.benefits.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check className="size-4 text-[var(--success)]" strokeWidth={3} />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mx-auto w-full max-w-2xl rounded-[1.5rem] bg-[var(--surface-strong)] p-4">
              <div className="rounded-[var(--container-radius)] bg-[var(--surface)] p-4 text-[var(--foreground)] sm:p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-2xl bg-[var(--primary)]">
                      <CalendarCheck2 className="size-5" />
                    </span>
                    <div>
                      <p className="text-xs font-extrabold tracking-[.14em] text-white/70 uppercase">
                        {t.live}
                      </p>
                      <p className="mt-0.5 text-sm font-bold">{t.today}</p>
                    </div>
                  </div>
                  <span className="flex gap-1.5" aria-hidden="true">
                    <i className="size-2 rounded-full bg-[var(--primary)]" />
                    <i className="size-2 rounded-full bg-[var(--highlight)]" />
                    <i className="size-2 rounded-full bg-white/25" />
                  </span>
                </div>

                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/70">{t.focus}</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">
                      {t.focusCount}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-xs font-bold text-[var(--highlight)]">
                    <Zap className="size-3.5" /> {t.streak}
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {t.demoTasks.map((task) => (
                    <div
                      key={task.title}
                      className="flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/[.045] p-3.5"
                    >
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-xl ${task.done ? "bg-[var(--highlight)] text-[var(--on-highlight)]" : "bg-white/7 text-white/70"}`}
                      >
                        {task.done ? (
                          <CheckCircle2 className="size-5" />
                        ) : (
                          <Circle className="size-5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{task.title}</p>
                        <p className="mt-1 text-xs text-white/70">{task.meta}</p>
                      </div>
                      <span className="size-2 rounded-full bg-[var(--primary)]" />
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[1.4rem] bg-[var(--primary)] p-4">
                    <TimerReset className="size-5" />
                    <p className="mt-5 text-xs font-semibold text-white/70">
                      {t.deepWork}
                    </p>
                    <p className="mt-1 text-xl font-black">{t.deepWorkTime}</p>
                  </div>
                  <div className="rounded-[1.4rem] bg-[var(--highlight)] p-4 text-[var(--on-highlight)]">
                    <BarChart3 className="size-5" />
                    <p className="mt-5 text-xs font-semibold text-black/55">{t.weekly}</p>
                    <p className="mt-1 text-xl font-black">{t.weeklyValue}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 sm:py-28">
          <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
              <div>
                <p className="eyebrow text-[var(--primary)]">{t.featuresEyebrow}</p>
                <h2 className="text-balance mt-4 max-w-2xl text-4xl leading-[1] font-black tracking-[-0.05em] text-[var(--foreground)] sm:text-6xl">
                  {t.featuresTitle}
                </h2>
              </div>
              <p className="max-w-xl text-base leading-8 text-[var(--muted)] lg:justify-self-end">
                {t.featuresDescription}
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {t.features.map(({ title, description }, index) => {
                const Icon = featureIcons[index];
                return (
                  <article
                    key={title}
                    className={`group relative min-h-72 overflow-hidden rounded-[var(--container-radius)] border p-6 transition-colors duration-200 ${index === 0 ? "bg-[var(--highlight)] text-[var(--on-highlight)]" : index === 1 ? "bg-[var(--surface)]" : "bg-[var(--surface-strong)] text-white"}`}
                  >
                    <span
                      className={`grid size-12 place-items-center rounded-2xl border ${index === 0 ? "border-black/10 bg-black/5" : index === 2 ? "border-white/10 bg-white/8 text-[var(--highlight)]" : "bg-[var(--primary-soft)] text-[var(--primary)]"}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="absolute inset-x-6 bottom-6">
                      <h3 className="text-xl font-black tracking-tight">{title}</h3>
                      <p
                        className={`mt-2 text-sm leading-7 ${index === 0 ? "text-black/70" : index === 2 ? "text-white/70" : "text-[var(--muted)]"}`}
                      >
                        {description}
                      </p>
                    </div>
                    {index === 1 && (
                      <div
                        className="absolute right-5 top-5 flex h-24 items-end gap-1.5 opacity-45"
                        aria-hidden="true"
                      >
                        {[44, 68, 52, 82, 64].map((height) => (
                          <i
                            key={height}
                            className="w-3 rounded-full bg-[var(--primary)]"
                            style={{ height }}
                          />
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="security" className="border-y bg-[var(--surface)] py-16 sm:py-20">
          <div className="mx-auto grid max-w-[88rem] gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:px-8">
            <div>
              <LockKeyhole className="size-7 text-[var(--primary)]" />
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em]">
                {t.securityTitle}
              </h2>
              <p className="mt-3 max-w-xl leading-7 text-[var(--muted)]">
                {t.securityDescription}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {t.securityItems.map((item) => (
                <div
                  key={item}
                  className="rounded-[var(--container-radius)] border bg-[var(--background)] p-5"
                >
                  <CheckCircle2 className="size-5 text-[var(--success)]" />
                  <p className="mt-4 text-sm font-semibold">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="py-20 sm:py-28">
          <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-8">
            <div className="paper-grid overflow-hidden rounded-[var(--container-radius)] border bg-[var(--primary)] p-6 text-[var(--on-primary)] shadow-lg sm:p-10 lg:p-14">
              <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
                <div>
                  <span className="eyebrow text-white/65">
                    <Users className="size-4" />
                    {t.workflowEyebrow}
                  </span>
                  <h2 className="mt-5 text-4xl leading-none font-black tracking-[-0.05em] sm:text-6xl">
                    {t.workflowTitle}
                  </h2>
                  <p className="mt-5 max-w-xl leading-8 text-white/75">
                    {t.workflowDescription}
                  </p>
                </div>
                <ol className="grid gap-3">
                  {t.steps.map((item, index) => (
                    <li
                      key={item}
                      className="flex items-center gap-4 rounded-[1.4rem] border border-white/15 bg-black/10 p-4 backdrop-blur"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--highlight)] font-black text-[var(--on-highlight)]">
                        {index + 1}
                      </span>
                      <span className="font-bold">{item}</span>
                      <ArrowRight className="ml-auto size-4 text-white/70" />
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[88rem] flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <Logo />
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <p className="text-sm text-[var(--muted)]">{t.footer}</p>
            <Link href="/contact" className="text-sm font-bold text-[var(--primary)]">
              {t.contact}
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
            <Paperclip className="size-3.5" /> Karino 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
