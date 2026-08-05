"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AtSign,
  BriefcaseBusiness,
  Camera,
  Code2,
  Mail,
  Send,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PublicHeader } from "@/components/marketing/public-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { createContactRequest, getContactConfigRequest } from "@/features/contact/api";
import { getErrorMessage } from "@/lib/api-error";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    eyebrow: "Contact Karino",
    title: "Let’s start a conversation.",
    description:
      "Send us your question or feedback. Our team will reply directly to the email address you provide.",
    details: "Contact details",
    socials: "Social networks",
    email: "Email",
    unavailable: "Not configured yet",
    formTitle: "Send a message",
    firstName: "First name",
    lastName: "Last name",
    message: "Your message",
    messagePlaceholder: "How can we help?",
    submit: "Send message",
    success: "Your message was sent successfully.",
    firstNameError: "Enter at least 2 characters.",
    lastNameError: "Enter at least 2 characters.",
    emailError: "Enter a valid email address.",
    messageError: "Write at least 10 characters.",
  },
  de: {
    eyebrow: "Karino kontaktieren",
    title: "Lass uns ins Gespräch kommen.",
    description:
      "Sende uns deine Frage oder dein Feedback. Unser Team antwortet direkt an die angegebene E-Mail-Adresse.",
    details: "Kontaktdaten",
    socials: "Soziale Netzwerke",
    email: "E-Mail",
    unavailable: "Noch nicht konfiguriert",
    formTitle: "Nachricht senden",
    firstName: "Vorname",
    lastName: "Nachname",
    message: "Deine Nachricht",
    messagePlaceholder: "Wie können wir helfen?",
    submit: "Nachricht senden",
    success: "Deine Nachricht wurde erfolgreich gesendet.",
    firstNameError: "Gib mindestens 2 Zeichen ein.",
    lastNameError: "Gib mindestens 2 Zeichen ein.",
    emailError: "Gib eine gültige E-Mail-Adresse ein.",
    messageError: "Schreibe mindestens 10 Zeichen.",
  },
} as const;

const socialIcons = {
  instagram: Camera,
  linkedin: BriefcaseBusiness,
  facebook: Users,
  telegram: Send,
  github: Code2,
  x: AtSign,
};

export function ContactView() {
  const { locale } = usePreferences();
  const t = copy[locale];
  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().trim().min(2, t.firstNameError),
        lastName: z.string().trim().min(2, t.lastNameError),
        email: z.string().trim().pipe(z.email(t.emailError)),
        message: z.string().trim().min(10, t.messageError).max(5000),
      }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;
  const configQuery = useQuery({
    queryKey: ["contact", "config"],
    queryFn: getContactConfigRequest,
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const submitMutation = useMutation({
    mutationFn: (values: FormValues) => createContactRequest({ ...values, locale }),
    onSuccess: () => {
      reset();
      toast.success(t.success);
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  return (
    <div className="min-h-dvh bg-[var(--background)]">
      <PublicHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="desk-grid-glow min-h-[calc(100dvh-5rem)] overflow-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
      >
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,.88fr)_minmax(30rem,1.12fr)]">
          <section
            className="desk-page-header desk-panel relative flex min-h-[31rem] flex-col justify-between overflow-hidden p-6 sm:p-8 lg:p-10"
            style={{ alignItems: "stretch", marginBottom: 0 }}
          >
            <div className="relative z-10 max-w-xl">
              <p className="desk-eyebrow">{t.eyebrow}</p>
              <h1
                className="mt-4 font-black tracking-[-0.055em]"
                style={{ fontSize: "clamp(2.65rem, 6vw, 4.75rem)" }}
              >
                {t.title}
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--muted)] sm:text-base">
                {t.description}
              </p>
            </div>

            <div className="relative z-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="desk-panel-soft p-4">
                <div className="flex items-start gap-3">
                  <span className="desk-icon-well shrink-0 text-[var(--primary)]">
                    <Mail className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[0.68rem] font-black tracking-[0.08em] text-[var(--muted)] uppercase">
                      <span className="desk-live-dot" aria-hidden="true" />
                      {t.details}
                    </p>
                    {configQuery.data?.email ? (
                      <a
                        href={`mailto:${configQuery.data.email}`}
                        className="mt-2 block break-all text-sm font-bold hover:text-[var(--primary)]"
                      >
                        {configQuery.data.email}
                      </a>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--muted)]">{t.unavailable}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="desk-panel-soft p-4">
                <p className="text-[0.68rem] font-black tracking-[0.08em] text-[var(--muted)] uppercase">
                  {t.socials}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(configQuery.data?.socials ?? []).map((social) => {
                    const Icon = socialIcons[social.platform];
                    return (
                      <a
                        key={social.platform}
                        href={social.url}
                        target="_blank"
                        rel="noreferrer"
                        className="focus-ring grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                        aria-label={social.platform}
                        title={social.platform}
                      >
                        <Icon className="size-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
            <div
              className="pointer-events-none absolute -end-32 -top-20 size-80 rounded-full bg-[var(--primary)]/15 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-28 -start-24 size-64 rounded-full bg-cyan-400/10 blur-3xl"
              aria-hidden="true"
            />
          </section>

          <Card className="desk-panel flex min-h-[31rem] flex-col overflow-hidden p-0">
            <div className="border-b border-[var(--border)] bg-[var(--surface-muted)]/55 px-5 py-5 sm:px-7">
              <p className="desk-eyebrow">{t.details}</p>
              <h2 className="desk-section-title mt-2 text-xl sm:text-2xl">
                {t.formTitle}
              </h2>
            </div>
            <form
              onSubmit={handleSubmit((values) => submitMutation.mutate(values))}
              className="grid flex-1 content-start gap-4 p-5 sm:p-7"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.firstName} error={errors.firstName?.message}>
                  <Input autoComplete="given-name" {...register("firstName")} />
                </Field>
                <Field label={t.lastName} error={errors.lastName?.message}>
                  <Input autoComplete="family-name" {...register("lastName")} />
                </Field>
              </div>
              <Field label={t.email} error={errors.email?.message}>
                <Input
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register("email")}
                />
              </Field>
              <Field label={t.message} error={errors.message?.message} compact>
                <Textarea
                  className="min-h-44 resize-none"
                  placeholder={t.messagePlaceholder}
                  {...register("message")}
                />
              </Field>
              <Button
                type="submit"
                size="lg"
                loading={submitMutation.isPending}
                className="mt-1 w-full sm:ms-auto sm:w-fit"
              >
                <Send className="size-4" />
                {t.submit}
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
