"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Switch from "@radix-ui/react-switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Edit3, Eye, RotateCcw, Search, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
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
  banUserRequest,
  deleteUserRequest,
  getUsersRequest,
  setAdminRoleRequest,
  unbanUserRequest,
  updateUserRequest,
  type UserFilters,
} from "@/features/admin/api";
import { useAuth } from "@/features/auth/auth-provider";
import { createProfileSchema, type ProfileFormValues } from "@/features/auth/schemas";
import { getErrorMessage } from "@/lib/api-error";
import { getBanReasonLabel } from "@/lib/domain-labels";
import type { BanReason, User } from "@/lib/types";
import { getId, initials } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const banReasons: BanReason[] = [
  "spam",
  "abusive-behavior",
  "harassment",
  "fraud",
  "terms-violation",
  "security",
  "other",
];

const copy = {
  en: {
    eyebrow: "Access and safety",
    title: "Users",
    description: "Open a profile to see its tasks and manage the user account.",
    search: "Search by name or email…",
    allRoles: "All roles",
    user: "Regular user",
    admin: "Administrator",
    superAdmin: "Super administrator",
    allStates: "All account states",
    active: "Active",
    banned: "Banned",
    loading: "Loading users…",
    emptyTitle: "No users found",
    emptyDescription: "Try another search or filter.",
    joined: "Joined",
    role: "Role",
    actions: "Actions",
    you: "You",
    edit: "Edit user",
    editDescription: "Update the user's name or email address.",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    save: "Save changes",
    saved: "User details saved.",
    adminAccess: "Administrator access",
    adminAccessDescription: "Grant or remove administrator access for this user.",
    promoteTitle: "Make this user an administrator?",
    promoteDescription: (name: string) =>
      `${name} will be able to access administrator tools and manage regular users.`,
    promoteConfirm: "Make administrator",
    demoteTitle: "Remove administrator access?",
    demoteDescription: (name: string) =>
      `${name} will return to a regular user and lose administrator access.`,
    demoteConfirm: "Remove access",
    roleEnabled: "Administrator access enabled.",
    roleRemoved: "Administrator access removed.",
    deleted: "User and related data deleted.",
    banTitle: "Ban user",
    banDescription: "The user will be signed out on every active device.",
    reason: "Ban reason",
    banAction: "Ban account",
    bannedDone: "The account was banned and active sessions were revoked.",
    unbannedDone: "The account was unbanned and ban metadata was cleared.",
    unbanTitle: "Unban user",
    unbanDescription: "All ban metadata will be cleared from the account.",
    deleteTitle: "Delete user",
    deleteDescription: (name: string) =>
      `${name}'s account, sessions, tasks, and attachments will be permanently deleted.`,
    previous: "Previous",
    next: "Next",
    page: "Page",
    users: "users",
    viewProfile: "Open profile and tasks",
    bannedReason: "Reason",
  },
  de: {
    eyebrow: "Zugriff und Sicherheit",
    title: "Benutzer",
    description:
      "Öffne ein Profil, um Aufgaben zu sehen und das Benutzerkonto zu verwalten.",
    search: "Nach Name oder E-Mail suchen…",
    allRoles: "Alle Rollen",
    user: "Standardbenutzer",
    admin: "Administrator",
    superAdmin: "Super-Administrator",
    allStates: "Alle Kontostatus",
    active: "Aktiv",
    banned: "Gesperrt",
    loading: "Benutzer werden geladen…",
    emptyTitle: "Keine Benutzer gefunden",
    emptyDescription: "Versuche eine andere Suche oder einen anderen Filter.",
    joined: "Registriert",
    role: "Rolle",
    actions: "Aktionen",
    you: "Du",
    edit: "Benutzer bearbeiten",
    editDescription: "Name oder E-Mail-Adresse des Benutzers ändern.",
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail",
    save: "Änderungen speichern",
    saved: "Benutzerdaten gespeichert.",
    adminAccess: "Administratorrechte",
    adminAccessDescription:
      "Administratorrechte für diesen Benutzer vergeben oder entfernen.",
    promoteTitle: "Diesen Benutzer zum Administrator machen?",
    promoteDescription: (name: string) =>
      `${name} erhält Zugriff auf Administratorwerkzeuge und kann Standardbenutzer verwalten.`,
    promoteConfirm: "Zum Administrator machen",
    demoteTitle: "Administratorrechte entfernen?",
    demoteDescription: (name: string) =>
      `${name} wird wieder Standardbenutzer und verliert den Administratorzugriff.`,
    demoteConfirm: "Zugriff entfernen",
    roleEnabled: "Administratorrechte aktiviert.",
    roleRemoved: "Administratorrechte entfernt.",
    deleted: "Benutzer und zugehörige Daten gelöscht.",
    banTitle: "Benutzer sperren",
    banDescription: "Der Benutzer wird auf allen aktiven Geräten abgemeldet.",
    reason: "Sperrgrund",
    banAction: "Konto sperren",
    bannedDone: "Das Konto wurde gesperrt und aktive Sitzungen wurden beendet.",
    unbannedDone: "Die Sperre und alle Sperrdaten wurden entfernt.",
    unbanTitle: "Sperre aufheben",
    unbanDescription: "Alle Sperrdaten werden aus dem Konto entfernt.",
    deleteTitle: "Benutzer löschen",
    deleteDescription: (name: string) =>
      `Konto, Sitzungen, Aufgaben und Anhänge von ${name} werden dauerhaft gelöscht.`,
    previous: "Zurück",
    next: "Weiter",
    page: "Seite",
    users: "Benutzer",
    viewProfile: "Profil und Aufgaben öffnen",
    bannedReason: "Grund",
  },
} as const;

function EditUserDialog({
  user,
  loading,
  canChangeAdminRole,
  onClose,
  onSave,
}: {
  user: User | null;
  loading: boolean;
  canChangeAdminRole: boolean;
  onClose: () => void;
  onSave: (values: ProfileFormValues, isAdmin: boolean | null) => Promise<void>;
}) {
  const { locale } = usePreferences();
  const t = copy[locale];
  const schema = useMemo(() => createProfileSchema(locale), [locale]);
  const [selectedAdminRole, setSelectedAdminRole] = useState(
    () => user?.roles.includes("admin") ?? false,
  );
  const [pendingAdminRole, setPendingAdminRole] = useState<boolean | null>(null);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", email: "" },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }
  }, [user, form]);

  const userIsAdmin = user?.roles.includes("admin") ?? false;
  const userName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const submitChanges = async (values: ProfileFormValues) => {
    const changedAdminRole =
      canChangeAdminRole && selectedAdminRole !== userIsAdmin ? selectedAdminRole : null;
    await onSave(values, changedAdminRole);
  };

  return (
    <>
      <Dialog
        open={Boolean(user)}
        onOpenChange={(open) => !open && onClose()}
        title={t.edit}
        description={t.editDescription}
      >
        <form className="space-y-2" onSubmit={form.handleSubmit(submitChanges)}>
          <Field label={t.firstName} error={form.formState.errors.firstName?.message}>
            <Input {...form.register("firstName")} autoComplete="off" />
          </Field>
          <Field label={t.lastName} error={form.formState.errors.lastName?.message}>
            <Input {...form.register("lastName")} autoComplete="off" />
          </Field>
          <Field label={t.email} error={form.formState.errors.email?.message}>
            <Input {...form.register("email")} type="email" autoComplete="off" />
          </Field>
          {canChangeAdminRole && (
            <div className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border bg-[var(--surface-muted)] p-3">
              <div className="min-w-0">
                <p className="text-sm font-black">{t.adminAccess}</p>
                <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
                  {t.adminAccessDescription}
                </p>
              </div>
              <Switch.Root
                checked={selectedAdminRole}
                disabled={loading}
                onCheckedChange={setPendingAdminRole}
                aria-label={t.adminAccess}
                className="focus-ring relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition data-[state=checked]:bg-[var(--primary)] disabled:opacity-50 dark:bg-slate-700"
              >
                <Switch.Thumb className="block size-6 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[1.375rem]" />
              </Switch.Root>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button type="submit" loading={loading}>
              {t.save}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(user) && pendingAdminRole !== null}
        onOpenChange={(open) => !open && setPendingAdminRole(null)}
        title={pendingAdminRole ? t.promoteTitle : t.demoteTitle}
        description={
          pendingAdminRole
            ? t.promoteDescription(userName)
            : t.demoteDescription(userName)
        }
        confirmLabel={pendingAdminRole ? t.promoteConfirm : t.demoteConfirm}
        confirmVariant={pendingAdminRole ? "primary" : "danger"}
        onConfirm={() => {
          if (pendingAdminRole === null) return;
          setSelectedAdminRole(pendingAdminRole);
          setPendingAdminRole(null);
        }}
      />
    </>
  );
}

function BanUserDialog({
  user,
  loading,
  onClose,
  onBan,
}: {
  user: User | null;
  loading: boolean;
  onClose: () => void;
  onBan: (reason: BanReason) => Promise<void>;
}) {
  const { locale } = usePreferences();
  const t = copy[locale];
  const [reason, setReason] = useState<BanReason>("terms-violation");

  return (
    <Dialog
      open={Boolean(user)}
      onOpenChange={(open) => !open && onClose()}
      title={t.banTitle}
      description={t.banDescription}
    >
      <div className="space-y-4">
        <label className="grid gap-2 text-sm font-bold">
          {t.reason}
          <Select
            value={reason}
            onChange={(event) => setReason(event.target.value as BanReason)}
          >
            {banReasons.map((value) => (
              <option key={value} value={value}>
                {getBanReasonLabel(value, locale)}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex justify-end">
          <Button variant="danger" loading={loading} onClick={() => void onBan(reason)}>
            <Ban className="size-4" />
            {t.banAction}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function AdminUsersView() {
  const { locale, intlLocale } = usePreferences();
  const t = copy[locale];
  const queryClient = useQueryClient();
  const { user: currentUser, isSuperAdmin, updateUser } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<UserFilters["role"]>("");
  const [banned, setBanned] = useState<UserFilters["banned"]>("");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [banningUser, setBanningUser] = useState<User | null>(null);
  const [unbanningUser, setUnbanningUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filters = useMemo<UserFilters>(
    () => ({ page, limit: 10, search: debouncedSearch, role, banned }),
    [page, debouncedSearch, role, banned],
  );
  const usersQuery = useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: () => getUsersRequest(filters),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const editMutation = useMutation({
    mutationFn: async ({
      user,
      values,
      isAdmin,
    }: {
      user: User;
      values: ProfileFormValues;
      isAdmin: boolean | null;
    }) => {
      let updated = await updateUserRequest(getId(user), values);
      if (isAdmin !== null) {
        updated = await setAdminRoleRequest(getId(user), isAdmin);
      }
      return updated;
    },
    onSuccess: async (updated, variables) => {
      if (currentUser && getId(currentUser) === getId(variables.user))
        updateUser(updated);
      setEditingUser(null);
      toast.success(
        variables.isAdmin === null
          ? t.saved
          : variables.isAdmin
            ? t.roleEnabled
            : t.roleRemoved,
      );
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({
          queryKey: ["admin", "user", getId(updated)],
        }),
      ]);
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });
  const banMutation = useMutation({
    mutationFn: ({ user, reason }: { user: User; reason: BanReason }) =>
      banUserRequest(getId(user), reason),
    onSuccess: async () => {
      setBanningUser(null);
      toast.success(t.bannedDone);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });
  const unbanMutation = useMutation({
    mutationFn: (user: User) => unbanUserRequest(getId(user)),
    onSuccess: async () => {
      setUnbanningUser(null);
      toast.success(t.unbannedDone);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });
  const deleteMutation = useMutation({
    mutationFn: (user: User) => deleteUserRequest(getId(user)),
    onSuccess: async () => {
      setDeletingUser(null);
      toast.success(t.deleted);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const users = usersQuery.data?.users ?? [];
  const pagination = usersQuery.data?.pagination;
  const canChangeEditingUserRole = Boolean(
    editingUser &&
    currentUser &&
    isSuperAdmin &&
    getId(editingUser) !== getId(currentUser) &&
    !editingUser.roles.includes("super_admin"),
  );
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }).format(new Date(value));

  return (
    <div>
      <p className="eyebrow text-[var(--primary)]">{t.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black">{t.title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
        {t.description}
      </p>

      <section className="mt-6 grid gap-3 rounded-[1.5rem] border bg-[var(--surface)] p-3 shadow-sm md:grid-cols-[1fr_12rem_13rem]">
        <label className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-4 size-4 text-[var(--muted)]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.search}
            className="ps-10"
          />
        </label>
        <Select
          value={role}
          onChange={(event) => {
            setRole(event.target.value as UserFilters["role"]);
            setPage(1);
          }}
        >
          <option value="">{t.allRoles}</option>
          <option value="user">{t.user}</option>
          <option value="admin">{t.admin}</option>
          <option value="super_admin">{t.superAdmin}</option>
        </Select>
        <Select
          value={banned}
          onChange={(event) => {
            setBanned(event.target.value as UserFilters["banned"]);
            setPage(1);
          }}
        >
          <option value="">{t.allStates}</option>
          <option value="false">{t.active}</option>
          <option value="true">{t.banned}</option>
        </Select>
      </section>

      <Card className="mt-6 overflow-hidden">
        {usersQuery.isPending ? (
          <LoadingState label={t.loading} />
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
          <div className="divide-y">
            {users.map((user) => {
              const id = getId(user);
              const self = id === currentUser?.id || id === currentUser?._id;
              const superAdmin = user.roles.includes("super_admin");
              const admin = user.roles.includes("admin");
              const targetStaff = admin || superAdmin;
              const mayManage = self || !targetStaff || isSuperAdmin;
              const mayBan = !self && !superAdmin && (!admin || isSuperAdmin);
              const roleLabel = superAdmin ? t.superAdmin : admin ? t.admin : t.user;
              const roleEmoji = superAdmin ? "👑" : admin ? "🛡️" : "👤";

              return (
                <article key={id} className="grid min-w-0 gap-3 p-4 xl:px-5">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] font-black text-[var(--primary-dark)]">
                        {initials(user.firstName, user.lastName)}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <Link
                          href={`/admin/users/${id}`}
                          className="focus-ring min-w-0 max-w-full break-words rounded font-bold hover:text-[var(--primary)]"
                          title={t.viewProfile}
                        >
                          {user.firstName} {user.lastName}
                        </Link>
                        <p
                          className="mt-1 min-w-0 max-w-full break-all text-xs text-[var(--muted)]"
                          dir="ltr"
                        >
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="grid max-w-full shrink-0 grid-cols-4 self-end gap-1 sm:self-start">
                      <Link
                        href={`/admin/users/${id}`}
                        className="focus-ring grid size-10 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                        aria-label={t.viewProfile}
                      >
                        <Eye className="size-4" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!mayManage}
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit3 className="size-4" />
                      </Button>
                      {user.ban?.isBanned ? (
                        <Button
                          variant="secondary"
                          size="icon"
                          disabled={!mayBan}
                          onClick={() => setUnbanningUser(user)}
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          size="icon"
                          disabled={!mayBan}
                          onClick={() => setBanningUser(user)}
                        >
                          <Ban className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="icon"
                        disabled={!mayManage || self}
                        onClick={() => setDeletingUser(user)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted)]">
                      <UserRound className="size-4 shrink-0" />
                      <span className="min-w-0 break-words">
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <span aria-hidden="true" className="text-lg leading-none">
                        {roleEmoji}
                      </span>
                      <span className="min-w-0 text-xs font-bold break-words text-[var(--muted)]">
                        {roleLabel}
                      </span>
                    </div>
                    {(self || user.ban?.isBanned) && (
                      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
                        {self && <Badge>{t.you}</Badge>}
                        {user.ban?.isBanned && (
                          <>
                            <Badge className="border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                              {t.banned}
                            </Badge>
                            <Badge className="max-w-full border-rose-200 bg-transparent text-rose-700 dark:text-rose-300">
                              <span className="break-words">
                                {t.bannedReason}:{" "}
                                {getBanReasonLabel(user.ban.reason, locale)}
                              </span>
                            </Badge>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">
            {pagination.total} {t.users} · {t.page} {pagination.page}
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

      <EditUserDialog
        key={editingUser ? getId(editingUser) : "closed"}
        user={editingUser}
        loading={editMutation.isPending}
        canChangeAdminRole={canChangeEditingUserRole}
        onClose={() => setEditingUser(null)}
        onSave={(values, isAdmin) =>
          editingUser
            ? editMutation
                .mutateAsync({ user: editingUser, values, isAdmin })
                .then(() => undefined)
            : Promise.resolve()
        }
      />
      <BanUserDialog
        key={banningUser?.id ?? "closed"}
        user={banningUser}
        loading={banMutation.isPending}
        onClose={() => setBanningUser(null)}
        onBan={(reason) =>
          banningUser
            ? banMutation.mutateAsync({ user: banningUser, reason }).then(() => undefined)
            : Promise.resolve()
        }
      />
      <ConfirmDialog
        open={Boolean(unbanningUser)}
        onOpenChange={(open) => !open && setUnbanningUser(null)}
        title={t.unbanTitle}
        description={t.unbanDescription}
        loading={unbanMutation.isPending}
        onConfirm={() =>
          unbanningUser
            ? unbanMutation.mutateAsync(unbanningUser).then(() => undefined)
            : undefined
        }
      />
      <ConfirmDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title={t.deleteTitle}
        description={t.deleteDescription(
          `${deletingUser?.firstName ?? ""} ${deletingUser?.lastName ?? ""}`.trim(),
        )}
        loading={deleteMutation.isPending}
        onConfirm={() =>
          deletingUser
            ? deleteMutation.mutateAsync(deletingUser).then(() => undefined)
            : undefined
        }
      />
    </div>
  );
}
