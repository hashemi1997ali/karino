"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Laptop,
  LogOut,
  MonitorSmartphone,
  Save,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/form-controls";
import { ErrorState, LoadingState } from "@/components/ui/states";
import {
  changePasswordRequest,
  getSessionsRequest,
  logoutAllSessionsRequest,
  logoutOtherSessionsRequest,
  revokeSessionRequest,
  updateProfileRequest,
} from "@/features/account/api";
import { useAuth } from "@/features/auth/auth-provider";
import {
  createPasswordChangeSchema,
  createProfileSchema,
  type PasswordChangeFormValues,
  type ProfileFormValues,
} from "@/features/auth/schemas";
import { getErrorMessage } from "@/lib/api-error";
import type { Locale } from "@/lib/preferences";
import type { RefreshSession } from "@/lib/types";
import { getId } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

interface AccountCopy {
  devices: {
    mobile: string;
    tablet: string;
    computer: string;
  };
  profileSaved: string;
  passwordChanged: string;
  otherSessionsClosed: string;
  sessionClosed: string;
  signedOutEverywhere: string;
  eyebrow: string;
  title: string;
  description: string;
  profileTitle: string;
  profileDescription: string;
  firstName: string;
  lastName: string;
  email: string;
  saveChanges: string;
  passwordTitle: string;
  passwordDescription: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  changePassword: string;
  sessionsTitle: string;
  sessionsDescription: string;
  signOutOthers: string;
  signOutAll: string;
  loadingSessions: string;
  currentDevice: string;
  ipUnavailable: string;
  lastUsed: string;
  expires: string;
  signOut: string;
  closeSession: string;
  signOutTitle: string;
  signOutDescription: string;
  signOutOthersTitle: string;
  signOutOthersDescription: string;
  signOutAllTitle: string;
  signOutAllDescription: string;
  closeSessionTitle: string;
  closeSessionDescription: string;
}

const copy = {
  en: {
    devices: { mobile: "Mobile", tablet: "Tablet", computer: "Computer" },
    profileSaved: "Your account details have been saved.",
    passwordChanged: "Your password was changed and your other sessions were closed.",
    otherSessionsClosed: "All other sessions have been closed.",
    sessionClosed: "The selected session has been closed.",
    signedOutEverywhere: "You have been signed out on every device.",
    eyebrow: "Personal settings",
    title: "Account",
    description: "Manage your profile, password, and devices connected to your account.",
    profileTitle: "Profile details",
    profileDescription: "The name and email shown on your account",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    saveChanges: "Save changes",
    passwordTitle: "Change password",
    passwordDescription: "Confirm the change with your current password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    changePassword: "Change password",
    sessionsTitle: "Active sessions",
    sessionsDescription: "Devices that can keep your account signed in",
    signOutOthers: "Sign out others",
    signOutAll: "Sign out everywhere",
    loadingSessions: "Loading sessions...",
    currentDevice: "Current device",
    ipUnavailable: "IP unavailable",
    lastUsed: "Last used",
    expires: "Expires",
    signOut: "Sign out",
    closeSession: "Close session",
    signOutTitle: "Sign out of this device?",
    signOutDescription:
      "This session will end on this device. You will need to sign in again to continue.",
    signOutOthersTitle: "Sign out on all other devices?",
    signOutOthersDescription:
      "Every session except this device will be revoked. This device will stay signed in.",
    signOutAllTitle: "Sign out on every device?",
    signOutAllDescription:
      "Every session, including this device, will be revoked. You will need to sign in again.",
    closeSessionTitle: "Close this session?",
    closeSessionDescription:
      "This device will no longer be able to stay signed in with its refresh token.",
  },
  de: {
    devices: { mobile: "Mobilgerät", tablet: "Tablet", computer: "Computer" },
    profileSaved: "Deine Kontodaten wurden gespeichert.",
    passwordChanged:
      "Dein Passwort wurde geändert und deine anderen Sitzungen wurden beendet.",
    otherSessionsClosed: "Alle anderen Sitzungen wurden beendet.",
    sessionClosed: "Die ausgewählte Sitzung wurde beendet.",
    signedOutEverywhere: "Du wurdest auf allen Geräten abgemeldet.",
    eyebrow: "Persönliche Einstellungen",
    title: "Konto",
    description:
      "Verwalte dein Profil, Passwort und die mit deinem Konto verbundenen Geräte.",
    profileTitle: "Profildaten",
    profileDescription: "Name und E-Mail-Adresse deines Kontos",
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail-Adresse",
    saveChanges: "Änderungen speichern",
    passwordTitle: "Passwort ändern",
    passwordDescription: "Bestätige die Änderung mit deinem aktuellen Passwort",
    currentPassword: "Aktuelles Passwort",
    newPassword: "Neues Passwort",
    confirmPassword: "Neues Passwort bestätigen",
    changePassword: "Passwort ändern",
    sessionsTitle: "Aktive Sitzungen",
    sessionsDescription: "Geräte, auf denen dein Konto angemeldet bleiben kann",
    signOutOthers: "Andere abmelden",
    signOutAll: "Überall abmelden",
    loadingSessions: "Sitzungen werden geladen...",
    currentDevice: "Aktuelles Gerät",
    ipUnavailable: "IP nicht verfügbar",
    lastUsed: "Zuletzt verwendet",
    expires: "Läuft ab",
    signOut: "Abmelden",
    closeSession: "Sitzung beenden",
    signOutTitle: "Von diesem Gerät abmelden?",
    signOutDescription:
      "Die Sitzung auf diesem Gerät wird beendet. Du musst dich erneut anmelden, um fortzufahren.",
    signOutOthersTitle: "Auf allen anderen Geräten abmelden?",
    signOutOthersDescription:
      "Alle Sitzungen außer dieser werden widerrufen. Dieses Gerät bleibt angemeldet.",
    signOutAllTitle: "Auf allen Geräten abmelden?",
    signOutAllDescription:
      "Alle Sitzungen, einschließlich dieses Geräts, werden widerrufen. Du musst dich danach erneut anmelden.",
    closeSessionTitle: "Diese Sitzung beenden?",
    closeSessionDescription:
      "Dieses Gerät kann mit seinem Refresh-Token nicht länger angemeldet bleiben.",
  },
} as const satisfies Record<Locale, AccountCopy>;

type DeviceKind = keyof AccountCopy["devices"];

function deviceInfo(userAgent: string | null): {
  kind: DeviceKind;
  icon: typeof Smartphone;
} {
  const value = userAgent?.toLowerCase() ?? "";
  if (/iphone|android|mobile/.test(value)) {
    return { kind: "mobile", icon: Smartphone };
  }
  if (/ipad|tablet/.test(value)) return { kind: "tablet", icon: MonitorSmartphone };
  return { kind: "computer", icon: Laptop };
}

const formatDateTime = (value: string, intlLocale: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export function AccountView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, updateUser, logout, endSessionLocally } = useAuth();
  const { locale, intlLocale } = usePreferences();
  const t = copy[locale];
  const [confirmCurrent, setConfirmCurrent] = useState(false);
  const [confirmOthers, setConfirmOthers] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<RefreshSession | null>(null);
  const localizedProfileSchema = useMemo(() => createProfileSchema(locale), [locale]);
  const localizedPasswordSchema = useMemo(
    () => createPasswordChangeSchema(locale),
    [locale],
  );
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(localizedProfileSchema),
  });
  const passwordForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(localizedPasswordSchema),
  });

  useEffect(() => {
    profileForm.clearErrors();
    passwordForm.clearErrors();
  }, [locale, profileForm, passwordForm]);

  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }
  }, [user, profileForm]);

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: getSessionsRequest,
  });

  const profileMutation = useMutation({
    mutationFn: updateProfileRequest,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      toast.success(t.profileSaved);
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const passwordMutation = useMutation({
    mutationFn: changePasswordRequest,
    onSuccess: () => {
      passwordForm.reset();
      toast.success(t.passwordChanged);
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const othersMutation = useMutation({
    mutationFn: logoutOtherSessionsRequest,
    onSuccess: async () => {
      setConfirmOthers(false);
      toast.success(t.otherSessionsClosed);
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const currentMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      setConfirmCurrent(false);
      router.replace("/");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (session: RefreshSession) => revokeSessionRequest(getId(session)),
    onSuccess: async () => {
      setSessionToRevoke(null);
      toast.success(t.sessionClosed);
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const allMutation = useMutation({
    mutationFn: logoutAllSessionsRequest,
    onSuccess: () => {
      setConfirmAll(false);
      endSessionLocally();
      toast.success(t.signedOutEverywhere);
      router.replace("/login");
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const submitProfile = profileForm.handleSubmit((values) =>
    profileMutation.mutateAsync(values).then(() => undefined),
  );
  const submitPassword = passwordForm.handleSubmit((values) =>
    passwordMutation
      .mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      .then(() => undefined),
  );

  return (
    <div>
      <div>
        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-300">
          {t.eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">
          {t.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{t.description}</p>
      </div>

      <div className="mt-7 grid items-start gap-5 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <UserRound className="size-5" />
            </span>
            <div>
              <h2 className="font-black text-[var(--foreground)]">{t.profileTitle}</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{t.profileDescription}</p>
            </div>
          </div>
          <form onSubmit={submitProfile} className="mt-5 grid gap-3" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t.firstName}
                error={profileForm.formState.errors.firstName?.message}
              >
                <Input
                  dir="auto"
                  autoComplete="given-name"
                  {...profileForm.register("firstName")}
                />
              </Field>
              <Field
                label={t.lastName}
                error={profileForm.formState.errors.lastName?.message}
              >
                <Input
                  dir="auto"
                  autoComplete="family-name"
                  {...profileForm.register("lastName")}
                />
              </Field>
            </div>
            <Field label={t.email} error={profileForm.formState.errors.email?.message}>
              <Input
                type="email"
                dir="ltr"
                autoComplete="email"
                {...profileForm.register("email")}
              />
            </Field>
            <div className="mt-2 flex justify-end">
              <Button type="submit" loading={profileMutation.isPending}>
                <Save className="size-4" /> {t.saveChanges}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <KeyRound className="size-5" />
            </span>
            <div>
              <h2 className="font-black text-[var(--foreground)]">{t.passwordTitle}</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {t.passwordDescription}
              </p>
            </div>
          </div>
          <form onSubmit={submitPassword} className="mt-5 grid gap-3" noValidate>
            <Field
              label={t.currentPassword}
              error={passwordForm.formState.errors.currentPassword?.message}
            >
              <Input
                type="password"
                dir="ltr"
                autoComplete="current-password"
                {...passwordForm.register("currentPassword")}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t.newPassword}
                error={passwordForm.formState.errors.newPassword?.message}
              >
                <Input
                  type="password"
                  dir="ltr"
                  autoComplete="new-password"
                  {...passwordForm.register("newPassword")}
                />
              </Field>
              <Field
                label={t.confirmPassword}
                error={passwordForm.formState.errors.confirmPassword?.message}
              >
                <Input
                  type="password"
                  dir="ltr"
                  autoComplete="new-password"
                  {...passwordForm.register("confirmPassword")}
                />
              </Field>
            </div>
            <div className="mt-2 flex justify-end">
              <Button type="submit" loading={passwordMutation.isPending}>
                <ShieldCheck className="size-4" /> {t.changePassword}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card className="mt-5 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <MonitorSmartphone className="size-5" />
            </span>
            <div>
              <h2 className="font-black text-[var(--foreground)]">{t.sessionsTitle}</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {t.sessionsDescription}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={othersMutation.isPending}
              onClick={() => setConfirmOthers(true)}
            >
              {t.signOutOthers}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmAll(true)}>
              {t.signOutAll}
            </Button>
          </div>
        </div>

        {sessionsQuery.isPending ? (
          <LoadingState label={t.loadingSessions} />
        ) : sessionsQuery.isError ? (
          <ErrorState
            message={getErrorMessage(sessionsQuery.error, locale)}
            retry={() => void sessionsQuery.refetch()}
          />
        ) : (
          <div className="mt-3 divide-y">
            {sessionsQuery.data.map((session) => {
              const device = deviceInfo(session.userAgent);
              const DeviceIcon = device.icon;
              return (
                <article
                  key={getId(session)}
                  className="flex flex-col gap-3 py-4 first:pt-2 sm:flex-row sm:items-center"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-muted)] text-[var(--muted)]">
                    <DeviceIcon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-[var(--foreground)]">
                        {t.devices[device.kind]}
                      </h3>
                      {session.isCurrent && (
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          {t.currentDevice}
                        </Badge>
                      )}
                    </div>
                    <p
                      className="mt-1 truncate text-xs text-[var(--muted)]"
                      title={session.userAgent ?? undefined}
                    >
                      <bdi dir="ltr">{session.ipAddress ?? t.ipUnavailable}</bdi> ·{" "}
                      {t.lastUsed} {formatDateTime(session.lastUsedAt, intlLocale)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)] opacity-80">
                      {t.expires}: {formatDateTime(session.expiresAt, intlLocale)}
                    </p>
                  </div>
                  {session.isCurrent ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmCurrent(true)}
                    >
                      <LogOut className="size-4" /> {t.signOut}
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setSessionToRevoke(session)}
                    >
                      {t.closeSession}
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmCurrent}
        onOpenChange={setConfirmCurrent}
        title={t.signOutTitle}
        description={t.signOutDescription}
        confirmLabel={t.signOut}
        loading={currentMutation.isPending}
        onConfirm={() => currentMutation.mutate()}
      />
      <ConfirmDialog
        open={confirmOthers}
        onOpenChange={setConfirmOthers}
        title={t.signOutOthersTitle}
        description={t.signOutOthersDescription}
        confirmLabel={t.signOutOthers}
        loading={othersMutation.isPending}
        onConfirm={() => othersMutation.mutate()}
      />

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title={t.signOutAllTitle}
        description={t.signOutAllDescription}
        confirmLabel={t.signOutAll}
        loading={allMutation.isPending}
        onConfirm={() => allMutation.mutateAsync().then(() => undefined)}
      />
      <ConfirmDialog
        open={Boolean(sessionToRevoke)}
        onOpenChange={(open) => {
          if (!open) setSessionToRevoke(null);
        }}
        title={t.closeSessionTitle}
        description={t.closeSessionDescription}
        confirmLabel={t.closeSession}
        loading={revokeMutation.isPending}
        onConfirm={() => {
          if (sessionToRevoke) {
            return revokeMutation.mutateAsync(sessionToRevoke).then(() => undefined);
          }
        }}
      />
    </div>
  );
}
