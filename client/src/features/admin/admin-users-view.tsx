"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Switch from "@radix-ui/react-switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Search, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  deleteUserRequest,
  getUsersRequest,
  setAdminRoleRequest,
  updateUserRequest,
  type UserFilters,
} from "@/features/admin/api";
import { useAuth } from "@/features/auth/auth-provider";
import { createProfileSchema, type ProfileFormValues } from "@/features/auth/schemas";
import { getErrorMessage } from "@/lib/api-error";
import type { Locale } from "@/lib/preferences";
import type { User } from "@/lib/types";
import { getId, initials } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

interface AdminUsersCopy {
  editTitle: string;
  editDescription: string;
  firstName: string;
  lastName: string;
  email: string;
  saveChanges: string;
  userSaved: string;
  adminEnabled: string;
  adminRemoved: string;
  userDeleted: string;
  eyebrow: string;
  title: string;
  description: string;
  searchPlaceholder: string;
  searchAria: string;
  roleFilterAria: string;
  allRoles: string;
  regularUser: string;
  administrator: string;
  loadingUsers: string;
  emptyTitle: string;
  emptyDescription: string;
  user: string;
  joined: string;
  adminAccess: string;
  actions: string;
  you: string;
  userSingular: string;
  userPlural: string;
  page: string;
  previous: string;
  next: string;
  deleteTitle: string;
  adminAccessAria: (name: string) => string;
  editAria: (name: string) => string;
  deleteAria: (name: string) => string;
  deleteDescription: (name: string) => string;
}

const isolate = (value: string): string => `\u2068${value}\u2069`;

const copy = {
  en: {
    editTitle: "Edit user",
    editDescription:
      "Update this user's name and email. Administrator access is managed separately.",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    saveChanges: "Save changes",
    userSaved: "The user's details have been saved.",
    adminEnabled: "Administrator access has been enabled.",
    adminRemoved: "Administrator access has been removed.",
    userDeleted: "The user and all related data have been deleted.",
    eyebrow: "Access management",
    title: "Users",
    description: "Review users, update their details, or change administrator access.",
    searchPlaceholder: "Search by name or email...",
    searchAria: "Search users",
    roleFilterAria: "Filter users by role",
    allRoles: "All roles",
    regularUser: "Regular user",
    administrator: "Administrator",
    loadingUsers: "Loading users...",
    emptyTitle: "No users found",
    emptyDescription: "Try another search term or role filter.",
    user: "User",
    joined: "Joined",
    adminAccess: "Administrator access",
    actions: "Actions",
    you: "You",
    userSingular: "user",
    userPlural: "users",
    page: "Page",
    previous: "Previous",
    next: "Next",
    deleteTitle: "Delete user",
    adminAccessAria: (name: string) => `Administrator access for ${isolate(name)}`,
    editAria: (name: string) => `Edit ${isolate(name)}`,
    deleteAria: (name: string) => `Delete ${isolate(name)}`,
    deleteDescription: (name: string) =>
      `The account for ${isolate(name)}, including all sessions, tasks, and attachments, will be permanently deleted.`,
  },
  de: {
    editTitle: "Benutzer bearbeiten",
    editDescription:
      "Ändere Name und E-Mail-Adresse. Administratorrechte werden separat verwaltet.",
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail-Adresse",
    saveChanges: "Änderungen speichern",
    userSaved: "Die Benutzerdaten wurden gespeichert.",
    adminEnabled: "Administratorrechte wurden aktiviert.",
    adminRemoved: "Administratorrechte wurden entfernt.",
    userDeleted: "Der Benutzer und alle zugehörigen Daten wurden gelöscht.",
    eyebrow: "Zugriffsverwaltung",
    title: "Benutzer",
    description:
      "Prüfe Benutzerdaten, bearbeite sie oder ändere die Administratorrechte.",
    searchPlaceholder: "Nach Name oder E-Mail-Adresse suchen...",
    searchAria: "Benutzer suchen",
    roleFilterAria: "Benutzer nach Rolle filtern",
    allRoles: "Alle Rollen",
    regularUser: "Standardbenutzer",
    administrator: "Administrator",
    loadingUsers: "Benutzer werden geladen...",
    emptyTitle: "Keine Benutzer gefunden",
    emptyDescription: "Versuche einen anderen Suchbegriff oder Rollenfilter.",
    user: "Benutzer",
    joined: "Registriert",
    adminAccess: "Administratorrechte",
    actions: "Aktionen",
    you: "Du",
    userSingular: "Benutzer",
    userPlural: "Benutzer",
    page: "Seite",
    previous: "Zurück",
    next: "Weiter",
    deleteTitle: "Benutzer löschen",
    adminAccessAria: (name: string) => `Administratorrechte für ${isolate(name)}`,
    editAria: (name: string) => `${isolate(name)} bearbeiten`,
    deleteAria: (name: string) => `${isolate(name)} löschen`,
    deleteDescription: (name: string) =>
      `Das Konto von ${isolate(name)} wird einschließlich aller Sitzungen, Aufgaben und Anhänge dauerhaft gelöscht.`,
  },
} as const satisfies Record<Locale, AdminUsersCopy>;

const formatDate = (value: string, intlLocale: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }).format(date);
};

const formatPagination = (
  total: number,
  page: number,
  intlLocale: string,
  t: AdminUsersCopy,
): string => {
  const number = new Intl.NumberFormat(intlLocale);
  const pluralCategory = new Intl.PluralRules(intlLocale).select(total);
  const noun = pluralCategory === "one" ? t.userSingular : t.userPlural;
  return `${number.format(total)} ${noun} · ${t.page} ${number.format(page)}`;
};

function UserEditDialog({
  user,
  onOpenChange,
  loading,
  onSave,
}: {
  user: User | null;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onSave: (values: ProfileFormValues) => Promise<void>;
}) {
  const { locale } = usePreferences();
  const t = copy[locale];
  const localizedProfileSchema = useMemo(() => createProfileSchema(locale), [locale]);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(localizedProfileSchema),
  });

  useEffect(() => {
    form.clearErrors();
  }, [locale, form]);

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }
  }, [user, form]);

  return (
    <Dialog
      open={Boolean(user)}
      onOpenChange={onOpenChange}
      title={t.editTitle}
      description={t.editDescription}
    >
      <form onSubmit={form.handleSubmit(onSave)} className="grid gap-3" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.firstName} error={form.formState.errors.firstName?.message}>
            <Input dir="auto" autoComplete="given-name" {...form.register("firstName")} />
          </Field>
          <Field label={t.lastName} error={form.formState.errors.lastName?.message}>
            <Input dir="auto" autoComplete="family-name" {...form.register("lastName")} />
          </Field>
        </div>
        <Field label={t.email} error={form.formState.errors.email?.message}>
          <Input
            type="email"
            dir="ltr"
            autoComplete="email"
            {...form.register("email")}
          />
        </Field>
        <div className="mt-2 flex justify-end">
          <Button type="submit" loading={loading}>
            {t.saveChanges}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function AdminUsersView() {
  const queryClient = useQueryClient();
  const { user: currentUser, updateUser } = useAuth();
  const { locale, intlLocale } = usePreferences();
  const t = copy[locale];
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<UserFilters["role"]>("");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filters = useMemo<UserFilters>(
    () => ({ page, limit: 10, search: debouncedSearch, role }),
    [page, debouncedSearch, role],
  );
  const usersQuery = useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: () => getUsersRequest(filters),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const editMutation = useMutation({
    mutationFn: ({ user, values }: { user: User; values: ProfileFormValues }) =>
      updateUserRequest(getId(user), values),
    onSuccess: async (updatedUser, variables) => {
      if (currentUser && getId(currentUser) === getId(variables.user)) {
        updateUser(updatedUser);
      }
      setEditingUser(null);
      toast.success(t.userSaved);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const roleMutation = useMutation({
    mutationFn: ({ user, isAdmin }: { user: User; isAdmin: boolean }) =>
      setAdminRoleRequest(getId(user), isAdmin),
    onSuccess: async (_data, variables) => {
      toast.success(variables.isAdmin ? t.adminEnabled : t.adminRemoved);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const deleteMutation = useMutation({
    mutationFn: (user: User) => deleteUserRequest(getId(user)),
    onSuccess: async () => {
      setDeletingUser(null);
      toast.success(t.userDeleted);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const users = usersQuery.data?.users ?? [];
  const pagination = usersQuery.data?.pagination;

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

      <section className="mt-6 grid gap-3 rounded-2xl border bg-[var(--surface)] p-3 shadow-sm sm:grid-cols-[1fr_13rem]">
        <label className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-3.5 size-4 text-[var(--muted)]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            dir="auto"
            placeholder={t.searchPlaceholder}
            className="ps-10"
            aria-label={t.searchAria}
          />
        </label>
        <Select
          value={role}
          onChange={(event) => {
            setRole(event.target.value as UserFilters["role"]);
            setPage(1);
          }}
          aria-label={t.roleFilterAria}
        >
          <option value="">{t.allRoles}</option>
          <option value="user">{t.regularUser}</option>
          <option value="admin">{t.administrator}</option>
        </Select>
      </section>

      <Card className="mt-6 overflow-hidden">
        {usersQuery.isPending ? (
          <LoadingState label={t.loadingUsers} />
        ) : usersQuery.isError ? (
          <div className="p-5">
            <ErrorState
              message={getErrorMessage(usersQuery.error, locale)}
              retry={() => void usersQuery.refetch()}
            />
          </div>
        ) : users.length === 0 ? (
          <div className="p-5">
            <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(15rem,1.4fr)_minmax(13rem,1fr)_9rem_10rem] gap-4 border-b bg-[var(--surface-muted)] px-5 py-3 text-xs font-bold text-[var(--muted)] md:grid">
              <span>{t.user}</span>
              <span>{t.joined}</span>
              <span>{t.adminAccess}</span>
              <span className="text-end">{t.actions}</span>
            </div>
            <div className="divide-y">
              {users.map((user) => {
                const id = getId(user);
                const self = id === currentUser?.id || id === currentUser?._id;
                const isAdmin = user.roles.includes("admin");
                return (
                  <article
                    key={id}
                    className="grid gap-4 p-4 md:grid-cols-[minmax(15rem,1.4fr)_minmax(13rem,1fr)_9rem_10rem] md:items-center md:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 font-black text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
                        {initials(user.firstName, user.lastName)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className="truncate text-sm font-bold text-[var(--foreground)]"
                            dir="auto"
                          >
                            <bdi>{user.firstName}</bdi> <bdi>{user.lastName}</bdi>
                          </p>
                          {self && (
                            <Badge className="bg-[var(--surface-muted)] text-[var(--muted)]">
                              {t.you}
                            </Badge>
                          )}
                        </div>
                        <p
                          className="mt-1 truncate text-xs text-[var(--muted)]"
                          dir="ltr"
                        >
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <UserRound className="size-4 md:hidden" />
                      {formatDate(user.createdAt, intlLocale)}
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch.Root
                        checked={isAdmin}
                        disabled={self || roleMutation.isPending}
                        onCheckedChange={(checked) =>
                          roleMutation.mutate({ user, isAdmin: checked })
                        }
                        className="focus-ring relative h-6 w-11 rounded-full bg-slate-200 transition data-[state=checked]:bg-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700"
                        aria-label={t.adminAccessAria(
                          `${user.firstName} ${user.lastName}`,
                        )}
                      >
                        <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-[#fff] shadow transition data-[state=checked]:translate-x-5" />
                      </Switch.Root>
                      {isAdmin && (
                        <ShieldCheck className="size-4 text-indigo-600 dark:text-indigo-300" />
                      )}
                    </div>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingUser(user)}
                        aria-label={t.editAria(user.firstName)}
                      >
                        <Edit3 className="size-4" />
                      </Button>
                      <Button
                        variant="danger"
                        size="icon"
                        disabled={self}
                        onClick={() => setDeletingUser(user)}
                        aria-label={t.deleteAria(user.firstName)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">
            {formatPagination(pagination.total, pagination.page, intlLocale, t)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!pagination.hasPreviousPage}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              {t.previous}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!pagination.hasNextPage}
              onClick={() => setPage((value) => value + 1)}
            >
              {t.next}
            </Button>
          </div>
        </div>
      )}

      <UserEditDialog
        user={editingUser}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
        loading={editMutation.isPending}
        onSave={(values) =>
          editingUser
            ? editMutation
                .mutateAsync({ user: editingUser, values })
                .then(() => undefined)
            : Promise.resolve()
        }
      />
      <ConfirmDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
        title={t.deleteTitle}
        description={t.deleteDescription(
          `${deletingUser?.firstName ?? ""} ${deletingUser?.lastName ?? ""}`.trim(),
        )}
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingUser) {
            return deleteMutation.mutateAsync(deletingUser).then(() => undefined);
          }
        }}
      />
    </div>
  );
}
