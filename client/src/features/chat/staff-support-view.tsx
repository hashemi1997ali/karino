"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Check,
  CircleStop,
  Headphones,
  Lightbulb,
  Send,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form-controls";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-provider";
import { ChatMessageBubble } from "@/features/chat/chat-message-bubble";
import {
  claimStaffChatRequest,
  endStaffChatRequest,
  getStaffSuggestionsRequest,
  listStaffChatsRequest,
  sendStaffMessageRequest,
  transferStaffChatRequest,
} from "@/features/chat/api";
import { getErrorMessage } from "@/lib/api-error";
import {
  getAssistantAgentLabel,
  getBanReasonLabel,
  getUserRoleLabel,
} from "@/lib/domain-labels";
import type { SupportChat, User } from "@/lib/types";
import { cn, getId } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    eyebrow: "Human support",
    title: "Support inbox",
    description:
      "Accept conversations, answer users, transfer difficult cases to a super admin, and open the user's profile and tasks.",
    empty: "There are no support conversations waiting right now.",
    loading: "Loading support conversations…",
    accept: "Accept chat",
    assigned: (name: string) => `Assigned to ${name}`,
    reply: "Write a reply…",
    send: "Send reply",
    transfer: "Transfer to super admin",
    end: "End chat",
    suggestions: "Suggested replies",
    profile: "Open user profile",
    tasks: "Open this user's tasks",
    waiting: "Waiting",
    active: "Active",
    super: "Super admin required",
    userDetails: "User details",
    banned: "Banned",
    noSelection: "Select a conversation from the inbox.",
    guest: "Guest",
    guestDetails: "Guest contact",
    endTitle: "End this support chat?",
    endDescription: "The conversation will be closed for both sides.",
    allHistory: "All chat history",
    supportQueue: "Support queue",
    assistantStatus: "AI chat",
    endedStatus: "Ended",
    previous: "Previous",
    next: "Next",
    page: "Page",
  },
  de: {
    eyebrow: "Menschlicher Support",
    title: "Support-Posteingang",
    description:
      "Unterhaltungen annehmen, Benutzern antworten, schwierige Fälle an einen Super-Admin übertragen und Profil sowie Aufgaben öffnen.",
    empty: "Momentan warten keine Support-Unterhaltungen.",
    loading: "Support-Unterhaltungen werden geladen…",
    accept: "Chat annehmen",
    assigned: (name: string) => `Zugewiesen an ${name}`,
    reply: "Antwort schreiben…",
    send: "Antwort senden",
    transfer: "An Super-Admin übertragen",
    end: "Chat beenden",
    suggestions: "Antwortvorschläge",
    profile: "Benutzerprofil öffnen",
    tasks: "Aufgaben dieses Benutzers öffnen",
    waiting: "Wartet",
    active: "Aktiv",
    super: "Super-Admin erforderlich",
    userDetails: "Benutzerdaten",
    banned: "Gesperrt",
    noSelection: "Wähle eine Unterhaltung aus dem Posteingang.",
    guest: "Gast",
    guestDetails: "Gastkontakt",
    endTitle: "Diesen Support-Chat beenden?",
    endDescription: "Die Unterhaltung wird für beide Seiten geschlossen.",
    allHistory: "Gesamter Chatverlauf",
    supportQueue: "Support-Warteschlange",
    assistantStatus: "KI-Chat",
    endedStatus: "Beendet",
    previous: "Zurück",
    next: "Weiter",
    page: "Seite",
  },
} as const;

const getChatUser = (
  chat: SupportChat | null,
): Pick<User, "id" | "firstName" | "lastName" | "email" | "roles" | "ban"> | null => {
  if (!chat || typeof chat.user === "string") return null;
  return chat.user;
};

export function StaffSupportView() {
  const { locale } = usePreferences();
  const t = copy[locale];
  const { user: currentUser, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [page, setPage] = useState(1);
  const endRef = useRef<HTMLDivElement>(null);
  const supportQueryKey = ["support", "queue", isSuperAdmin, page] as const;

  const chatsQuery = useQuery({
    queryKey: supportQueryKey,
    queryFn: () =>
      listStaffChatsRequest({
        scope: isSuperAdmin ? "all" : "queue",
        page,
        limit: 50,
      }),
    refetchInterval: 4_000,
  });
  const chats = useMemo(() => chatsQuery.data?.chats ?? [], [chatsQuery.data?.chats]);
  const effectiveSelectedId =
    selectedId && chats.some((chat) => chat.id === selectedId)
      ? selectedId
      : (chats[0]?.id ?? null);
  const selected = chats.find((chat) => chat.id === effectiveSelectedId) ?? null;
  const chatUser = getChatUser(selected);
  const assignedToMe =
    Boolean(selected?.assignedTo) &&
    selected?.assignedTo === (currentUser ? getId(currentUser) : "");
  const canReply = assignedToMe && selected?.status === "active";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [effectiveSelectedId, selected?.messages.length]);

  const updateCache = (chat: SupportChat) => {
    queryClient.setQueryData<Awaited<ReturnType<typeof listStaffChatsRequest>>>(
      supportQueryKey,
      (current) =>
        current
          ? {
              ...current,
              chats: current.chats.map((item) => (item.id === chat.id ? chat : item)),
            }
          : current,
    );
    setSelectedId(chat.id);
  };

  const mutationOptions = {
    onError: (error: Error) => toast.error(getErrorMessage(error, locale)),
  };
  const claimMutation = useMutation({
    mutationFn: claimStaffChatRequest,
    onSuccess: updateCache,
    ...mutationOptions,
  });
  const sendMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      sendStaffMessageRequest(id, text),
    onSuccess: (chat) => {
      updateCache(chat);
      setMessage("");
      setSuggestions([]);
    },
    ...mutationOptions,
  });
  const transferMutation = useMutation({
    mutationFn: transferStaffChatRequest,
    onSuccess: async (chat) => {
      updateCache(chat);
      toast.success(t.transfer);
      await chatsQuery.refetch();
    },
    ...mutationOptions,
  });
  const endMutation = useMutation({
    mutationFn: endStaffChatRequest,
    onSuccess: async () => {
      toast.success(t.end);
      setConfirmEnd(false);
      setSelectedId(null);
      await chatsQuery.refetch();
    },
    ...mutationOptions,
  });
  const suggestionsMutation = useMutation({
    mutationFn: (id: string) => getStaffSuggestionsRequest(id, locale),
    onSuccess: setSuggestions,
    ...mutationOptions,
  });

  const send = () => {
    const text = message.trim();
    if (!selected || !canReply || !text) return;
    sendMutation.mutate({ id: selected.id, text });
  };

  return (
    <>
      <div>
        <p className="eyebrow text-[var(--primary)]">{t.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black">{t.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          {t.description}
        </p>

        {chatsQuery.isPending ? (
          <div className="mt-8">
            <LoadingState label={t.loading} />
          </div>
        ) : chatsQuery.isError ? (
          <div className="mt-8">
            <ErrorState
              message={getErrorMessage(chatsQuery.error, locale)}
              retry={() => void chatsQuery.refetch()}
            />
          </div>
        ) : chats.length === 0 ? (
          <Card className="mt-8 grid min-h-52 place-items-center p-8 text-center text-sm text-[var(--muted)]">
            <Headphones className="mb-3 size-8 text-[var(--primary)]" />
            {t.empty}
          </Card>
        ) : (
          <div className="mt-7 grid items-start gap-5 xl:grid-cols-[20rem_minmax(0,1fr)_18rem]">
            <Card className="flex h-[min(70dvh,46rem)] min-h-[32rem] flex-col overflow-hidden p-2">
              <p className="shrink-0 px-3 py-2 text-xs font-black text-[var(--muted)] uppercase">
                {isSuperAdmin ? t.allHistory : t.supportQueue}
              </p>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {chats.map((chat) => {
                  const owner = typeof chat.user === "string" ? null : chat.user;
                  const statusText =
                    chat.status === "assistant"
                      ? t.assistantStatus
                      : chat.status === "open"
                        ? t.waiting
                        : chat.status === "active"
                          ? t.active
                          : t.endedStatus;
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(chat.id);
                        setSuggestions([]);
                      }}
                      className={cn(
                        "focus-ring mb-1 w-full rounded-2xl p-3 text-left transition",
                        effectiveSelectedId === chat.id
                          ? "bg-[var(--primary-soft)]"
                          : "hover:bg-[var(--surface-muted)]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black">
                          {owner
                            ? `${owner.firstName} ${owner.lastName}`
                            : (chat.guest?.label ?? t.guest)}
                        </p>
                        <Badge
                          className={cn(
                            chat.status === "open" && "text-amber-700",
                            chat.status === "active" && "text-emerald-700",
                            chat.status === "ended" && "text-[var(--muted)]",
                          )}
                        >
                          {statusText}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-[var(--muted)]">
                        {owner?.email ?? chat.guest?.email ?? t.guest}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                        {chat.messages.at(-1)?.content}
                      </p>
                      {chat.requiresSuperAdmin && (
                        <p className="mt-2 text-[10px] font-black text-[var(--primary)] uppercase">
                          {t.super}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
              {chatsQuery.data && chatsQuery.data.pagination.totalPages > 1 && (
                <div className="flex shrink-0 items-center justify-between gap-2 border-t p-2 text-xs">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!chatsQuery.data.pagination.hasPreviousPage}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    {t.previous}
                  </Button>
                  <span className="text-[var(--muted)]">
                    {t.page} {chatsQuery.data.pagination.page} /{" "}
                    {chatsQuery.data.pagination.totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!chatsQuery.data.pagination.hasNextPage}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    {t.next}
                  </Button>
                </div>
              )}
            </Card>

            <Card className="flex h-[min(70dvh,46rem)] min-h-[32rem] flex-col overflow-hidden">
              {!selected ? (
                <div className="grid flex-1 place-items-center text-sm text-[var(--muted)]">
                  {t.noSelection}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[var(--surface-muted)] p-4">
                    <div>
                      <p className="font-black">
                        {chatUser
                          ? `${chatUser.firstName} ${chatUser.lastName}`
                          : (selected.guest?.label ?? t.guest)}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {selected.status === "ended"
                          ? t.endedStatus
                          : selected.status === "assistant"
                            ? t.assistantStatus
                            : selected.assignedToName
                              ? t.assigned(selected.assignedToName)
                              : t.waiting}
                      </p>
                    </div>
                    {selected.status === "open" && (
                      <Button
                        size="sm"
                        loading={claimMutation.isPending}
                        onClick={() => claimMutation.mutate(selected.id)}
                      >
                        <Check className="size-4" />
                        {t.accept}
                      </Button>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto p-4">
                    {selected.messages.map((item) => (
                      <ChatMessageBubble
                        key={item.id}
                        direction={
                          item.sender === "staff"
                            ? "outgoing"
                            : item.sender === "system"
                              ? "system"
                              : "incoming"
                        }
                        content={item.content}
                        createdAt={item.createdAt}
                        name={
                          item.sender === "ai" && item.senderName
                            ? getAssistantAgentLabel(item.senderName, locale)
                            : item.senderName
                        }
                      />
                    ))}
                    <div ref={endRef} />
                  </div>

                  {suggestions.length > 0 && (
                    <div className="space-y-2 border-t bg-[var(--highlight-soft)] p-3">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setMessage(suggestion)}
                          className="focus-ring block w-full rounded-xl border bg-[var(--surface)] p-2 text-left text-xs hover:border-[var(--primary)]"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="border-t p-3">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!canReply}
                        loading={suggestionsMutation.isPending}
                        onClick={() => suggestionsMutation.mutate(selected.id)}
                      >
                        <Lightbulb className="size-4" />
                        {t.suggestions}
                      </Button>
                      {!isSuperAdmin && canReply && (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={transferMutation.isPending}
                          onClick={() => transferMutation.mutate(selected.id)}
                        >
                          <ArrowUpRight className="size-4" />
                          {t.transfer}
                        </Button>
                      )}
                      {canReply && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={endMutation.isPending}
                          onClick={() => setConfirmEnd(true)}
                          aria-label={t.end}
                          title={t.end}
                        >
                          <CircleStop className="size-4" />
                          {t.end}
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={message}
                        disabled={!canReply}
                        onChange={(event) => setMessage(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            send();
                          }
                        }}
                        placeholder={t.reply}
                      />
                      <Button
                        size="icon"
                        disabled={!canReply}
                        loading={sendMutation.isPending}
                        onClick={send}
                        aria-label={t.send}
                      >
                        <Send className="size-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>

            <Card className="h-fit p-4">
              <p className="text-sm font-black">{t.userDetails}</p>
              {chatUser ? (
                <div className="mt-4 space-y-3 text-sm">
                  <span className="grid size-12 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                    <UserRound className="size-5" />
                  </span>
                  <div>
                    <p className="font-black">
                      {chatUser.firstName} {chatUser.lastName}
                    </p>
                    <p className="break-all text-xs text-[var(--muted)]">
                      {chatUser.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {chatUser.roles.map((role) => (
                      <Badge key={role}>{getUserRoleLabel(role, locale)}</Badge>
                    ))}
                  </div>
                  {chatUser.ban?.isBanned && (
                    <p className="rounded-xl bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                      {t.banned}: {getBanReasonLabel(chatUser.ban.reason, locale)}
                    </p>
                  )}
                  <Link
                    href={`/admin/users/${chatUser.id}`}
                    className="focus-ring flex items-center justify-between rounded-xl border p-3 text-xs font-bold hover:border-[var(--primary)]"
                  >
                    {t.profile}
                    <ArrowUpRight className="size-4" />
                  </Link>
                  <Link
                    href={`/admin/users/${chatUser.id}#tasks`}
                    className="focus-ring flex items-center justify-between rounded-xl border p-3 text-xs font-bold hover:border-[var(--primary)]"
                  >
                    {t.tasks}
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              ) : selected?.origin === "guest" ? (
                <div className="mt-4 space-y-2 text-sm">
                  <p className="font-black">{t.guestDetails}</p>
                  <p className="break-all text-xs text-[var(--muted)]">
                    {selected.guest?.email ?? t.guest}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-[var(--muted)]">{t.noSelection}</p>
              )}
            </Card>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title={t.endTitle}
        description={t.endDescription}
        confirmLabel={t.end}
        loading={endMutation.isPending}
        onConfirm={() => {
          if (selected) endMutation.mutate(selected.id);
        }}
      />
    </>
  );
}
