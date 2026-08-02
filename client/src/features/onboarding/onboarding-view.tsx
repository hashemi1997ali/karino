"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Check,
  ListTodo,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form-controls";
import { useAuth } from "@/features/auth/auth-provider";
import { completeOnboardingRequest } from "@/features/auth/api";
import { createTaskRequest } from "@/features/tasks/api";
import { getErrorMessage } from "@/lib/api-error";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    step: "Step",
    of: "of",
    continue: "Continue",
    back: "Back",
    finish: "Open my workspace",
    goalTitle: "What will you use Karino for?",
    goalDescription: "We’ll adapt your starting workspace to what matters most.",
    styleTitle: "How do you like to plan?",
    styleDescription: "Choose a starting point. You can change your workflow later.",
    taskTitle: "Create your first task",
    taskDescription: "Start with one clear outcome you want to move forward.",
    aiTitle: "Meet Karino AI",
    aiDescription:
      "Ask for a daily plan, priority help, or a clearer next step. You always review changes before they are applied.",
    taskPlaceholder: "e.g. Prepare the project outline",
    goals: ["Personal planning", "Study", "Work", "Project management", "Other"],
    styles: ["Simple list", "Daily planner", "Priority focused"],
    aiPrompt: "Help me plan my day",
  },
  de: {
    step: "Schritt",
    of: "von",
    continue: "Weiter",
    back: "Zurück",
    finish: "Arbeitsbereich öffnen",
    goalTitle: "Wofür möchtest du Karino nutzen?",
    goalDescription: "Wir passen deinen Startbereich an deine wichtigsten Ziele an.",
    styleTitle: "Wie planst du am liebsten?",
    styleDescription: "Wähle einen Startpunkt. Du kannst ihn später ändern.",
    taskTitle: "Erstelle deine erste Aufgabe",
    taskDescription: "Beginne mit einem klaren Ergebnis, das du erreichen möchtest.",
    aiTitle: "Lerne Karino AI kennen",
    aiDescription:
      "Bitte um einen Tagesplan, Priorisierung oder den nächsten Schritt. Änderungen werden immer vorab bestätigt.",
    taskPlaceholder: "z. B. Projektentwurf vorbereiten",
    goals: ["Persönliche Planung", "Studium", "Arbeit", "Projektmanagement", "Sonstiges"],
    styles: ["Einfache Liste", "Tagesplaner", "Prioritätsfokus"],
    aiPrompt: "Hilf mir, meinen Tag zu planen",
  },
} as const;

const goalValues = ["personal", "study", "work", "projects", "other"] as const;
const styleValues = ["simple", "daily", "priority"] as const;

export function OnboardingView() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { locale } = usePreferences();
  const t = copy[locale];
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<User["primaryUseCase"]>("work");
  const [style, setStyle] = useState<User["planningStyle"]>("priority");
  const [taskTitle, setTaskTitle] = useState("");

  const finishMutation = useMutation({
    mutationFn: async () => {
      if (taskTitle.trim()) {
        await createTaskRequest({
          title: taskTitle.trim(),
          priority: "medium",
          status: "todo",
        });
      }
      return completeOnboardingRequest({
        primaryUseCase: goal ?? "work",
        planningStyle: style ?? "priority",
      });
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      router.replace("/dashboard");
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  if (user?.onboardingCompleted) {
    router.replace("/dashboard");
    return null;
  }

  const titles = [t.goalTitle, t.styleTitle, t.taskTitle, t.aiTitle];
  const descriptions = [
    t.goalDescription,
    t.styleDescription,
    t.taskDescription,
    t.aiDescription,
  ];

  return (
    <main
      id="main-content"
      className="min-h-dvh bg-[var(--background)] px-4 py-6 sm:px-6"
    >
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-sm text-[var(--muted)]">
            {t.step} {step + 1} {t.of} 4
          </span>
        </div>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-[var(--surface-muted)]">
          <div
            className="h-full bg-[var(--primary)] transition-transform"
            style={{ width: `${(step + 1) * 25}%` }}
          />
        </div>
        <Card className="mx-auto mt-10 max-w-2xl p-6 sm:p-9">
          <div className="text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-[12px] bg-[var(--primary-soft)] text-[var(--primary)]">
              {step === 3 ? (
                <Bot className="size-5" />
              ) : step === 2 ? (
                <ListTodo className="size-5" />
              ) : (
                <Sparkles className="size-5" />
              )}
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-[-0.02em]">{titles[step]}</h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">
              {descriptions[step]}
            </p>
          </div>

          <div className="mt-7">
            {step === 0 && (
              <div className="grid gap-2">
                {goalValues.map((value, index) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGoal(value)}
                    className={cn(
                      "focus-ring flex min-h-12 items-center gap-3 rounded-[10px] border px-4 text-left text-sm font-medium",
                      goal === value &&
                        "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]",
                    )}
                  >
                    <BriefcaseBusiness className="size-4" />
                    {t.goals[index]}
                    {goal === value && <Check className="ml-auto size-4" />}
                  </button>
                ))}
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {styleValues.map((value, index) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStyle(value)}
                    className={cn(
                      "focus-ring min-h-28 rounded-[12px] border p-4 text-left text-sm font-semibold",
                      style === value &&
                        "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]",
                    )}
                  >
                    <ListTodo className="mb-5 size-5" />
                    {t.styles[index]}
                  </button>
                ))}
              </div>
            )}
            {step === 2 && (
              <Input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder={t.taskPlaceholder}
                autoFocus
              />
            )}
            {step === 3 && (
              <div className="rounded-[12px] border bg-[var(--background)] p-4">
                <p className="text-sm text-[var(--muted)]">{t.aiPrompt}</p>
                <div className="mt-3 rounded-[10px] bg-[var(--primary-soft)] p-4 text-sm leading-6">
                  {t.aiDescription}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((value) => value - 1)}
            >
              <ArrowLeft className="size-4" /> {t.back}
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((value) => value + 1)}
                disabled={step === 2 && taskTitle.trim().length < 3}
              >
                {t.continue} <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                loading={finishMutation.isPending}
                onClick={() => finishMutation.mutate()}
              >
                {t.finish} <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
