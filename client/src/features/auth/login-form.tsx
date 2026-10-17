"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/form-controls";
import { useAuth } from "@/features/auth/auth-provider";
import { createLoginSchema, type LoginFormValues } from "@/features/auth/schemas";
import { getErrorMessage } from "@/lib/api-error";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    success: "Welcome back. You're now logged in.",
    title: "Welcome back 👋",
    description: "Log in to keep planning and completing your work.",
    email: "Email",
    password: "Password",
    submit: "Log in",
    forgot: "Forgot password?",
    noAccount: "Don't have an account?",
    register: "Create one",
  },
  de: {
    success: "Willkommen zurück. Du bist jetzt angemeldet.",
    title: "Willkommen zurück 👋",
    description: "Melde dich an, um deine Aufgaben weiter zu planen und zu erledigen.",
    email: "E-Mail",
    password: "Passwort",
    hidePassword: "Passwort ausblenden",
    submit: "Anmelden",
    forgot: "Passwort vergessen?",
    noAccount: "Du hast noch kein Konto?",
    register: "Konto erstellen",
  },
} as const;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, status } = useAuth();
  const { locale } = usePreferences();
  const t = copy[locale];
  const schema = useMemo(() => createLoginSchema(locale), [locale]);
  const next = searchParams.get("next");
  const destination =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (status === "authenticated") router.replace(destination);
  }, [status, destination, router]);

  useEffect(() => clearErrors(), [locale, clearErrors]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      toast.success(t.success);
      router.replace(destination);
    } catch (error) {
      toast.error(getErrorMessage(error, locale));
    }
  });

  return (
    <div className="w-full">
      <p className="eyebrow text-[var(--primary)]">Karino workspace</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        {t.title}
      </h1>
      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{t.description}</p>
      <form onSubmit={onSubmit} className="mt-8 grid gap-4" noValidate>
        <Field label={t.email} error={errors.email?.message}>
          <Input
            type="email"
            dir="ltr"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
          />
        </Field>
        <Field label={t.password} error={errors.password?.message}>
          <PasswordInput autoComplete="current-password" {...register("password")} />
        </Field>
        <Link
          href="/forgot-password"
          className="-mt-2 justify-self-end text-xs font-bold text-[var(--primary)] hover:text-[var(--primary-dark)]"
        >
          {t.forgot}
        </Link>
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-1 w-full">
          <LogIn className="size-4" />
          {t.submit}
        </Button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">
        {t.noAccount}{" "}
        <Link
          href="/register"
          className="font-bold text-[var(--primary)] hover:text-[var(--primary-dark)]"
        >
          {t.register}
        </Link>
      </p>
    </div>
  );
}
