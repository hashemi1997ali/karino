"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Check,
  CircleStop,
  Headphones,
  Lightbulb,
  Send,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form-controls";
import { PageHeading } from "@/components/ui/page-heading";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-provider";
import { ChatMessageBubble } from "@/features/chat/chat-message-bubble";
import { DateGroupedMessageList } from "@/features/chat/date-grouped-message-list";
import {
  claimStaffChatRequest,
  endStaffChatRequest,
  getStaffSuggestionsRequest,
  listStaffChatsRequest,
  rewriteStaffMessageRequest,
  sendStaffMessageRequest,
  transferStaffChatRequest,
} from "@/features/chat/api";
import { getErrorMessage } from "@/lib/api-error";
import {
  getAssistantAgentLabel,
  getLocalizedSupportSystemMessage,
} from "@/lib/domain-labels";
import type { SupportChat, User } from "@/lib/types";
import { cn, getId } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    eyebrow: "Human support",
    title: "Support inbox",
    description: "Join and manage human support conversations.",
    empty: "There are no support conversations waiting right now.",
    loading: "Loading support conversations…",
    accept: "Join chat",
    assigned: (name: string) => `Assigned to ${name}`,
    reply: "Write a reply…",
    send: "Send reply",
    transfer: "Transfer to Super Support",
    end: "End chat",
    suggestions: "Suggested replies",
    improve: "Improve draft",
    improved: "Your draft was improved.",
    profile: "Open user profile",
    tasks: "Open this user's tasks",
    waiting: "Waiting",
    active: "Active",
    super: "Super Support required",
    userDetails: "User details",
    banned: "Banned",
    noSelection: "Select a conversation from the inbox.",
    guest: "Guest",
    guestDetails: "Guest contact",
    endTitle: "End this support chat?",
    endDescription: "The conversation will be closed for both sides.",
    allHistory: "All chat history",
    supportQueue: "Support queue",
    assistantStatus: "AI Assistant",
    endedStatus: "Ended",
    previous: "Previous",
    next: "Next",
    page: "Page",
    takeoverTitle: "Join this active chat?",
    takeoverDescription:
      "The current Support Agent will leave the conversation and you will become the assigned Super Support Agent.",
    takeoverConfirm: "Join and replace",
    superQueue: "Super",
    historyRole: {
      user: "user",
      admin: "admin",
      super_admin: "super admin",
      guest: "guest",
    },
  },
  de: {
    eyebrow: "Menschlicher Support",
    title: "Support-Posteingang",
    description: "Menschliche Support-Unterhaltungen beitreten und verwalten.",
    empty: "Momentan warten keine Support-Unterhaltungen.",
    loading: "Support-Unterhaltungen werden geladen…",
    accept: "Chat beitreten",
    assigned: (name: string) => `Zugewiesen an ${name}`,
    reply: "Antwort schreiben…",
    send: "Antwort senden",
    transfer: "An Super-Support übertragen",
    end: "Chat beenden",
    suggestions: "Antwortvorschläge",
    improve: "Entwurf verbessern",
    improved: "Dein Entwurf wurde verbessert.",
    profile: "Benutzerprofil öffnen",
    tasks: "Aufgaben dieses Benutzers öffnen",
    waiting: "Wartet",
    active: "Aktiv",
    super: "Super-Support erforderlich",
    userDetails: "Benutzerdaten",
    banned: "Gesperrt",
    noSelection: "Wähle eine Unterhaltung aus dem Posteingang.",
    guest: "Gast",
    guestDetails: "Gastkontakt",
    endTitle: "Diesen Support-Chat beenden?",
    endDescription: "Die Unterhaltung wird für beide Seiten geschlossen.",
    allHistory: "Gesamter Chatverlauf",
    supportQueue: "Support-Warteschlange",
    assistantStatus: "AI Assistant",
    endedStatus: "Beendet",
    previous: "Zurück",
    next: "Weiter",
    page: "Seite",
    takeoverTitle: "Diesem aktiven Chat beitreten?",
    takeoverDescription:
      "Der aktuelle Support-Agent verlässt die Unterhaltung und du wirst als Super-Support-Agent zugewiesen.",
    takeoverConfirm: "Beitreten und übernehmen",
    superQueue: "Super",
    historyRole: {
      user: "user",
      admin: "admin",
      super_admin: "super admin",
      guest: "guest",
    },
  },
} as const;

const getChatUser = (
  chat: SupportChat | null,
): Pick<
  User,
  "id" | "firstName" | "lastName" | "email" | "roles" | "profileImage" | "ban"
> | null => {
  if (!chat || typeof chat.user === "string") return null;
  return chat.user;
};

export function StaffSupportView() {
  const { locale, intlLocale } = usePreferences();
  const t = copy[locale];
  const { user: currentUser, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmTakeover, setConfirmTakeover] = useState(false);
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
  const firstNameOnly = (name: string | null | undefined) =>
    name?.trim().split(/\s+/)[0] ?? "";
  const userFullName = (
    user: Pick<User, "firstName" | "lastName">,
  ) => `${user.firstName} ${user.lastName}`.trim();
  const formatLastMessage = (chat: SupportChat) => {
    const value = chat.messages.at(-1)?.createdAt ?? chat.updatedAt;
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  };
  const formatMessageDate = (value: string) =>
    new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }).format(
      new Date(value),
    );

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

  const rewriteMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      rewriteStaffMessageRequest(id, text),
    onSuccess: (rewritten) => {
      setMessage(rewritten);
      toast.success(t.improved);
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const send = () => {
    const text = message.trim();
    if (!selected || !canReply || !text) return;
    sendMutation.mutate({ id: selected.id, text });
  };

  return (
    <>
      <div className="lg:flex lg:h-[calc(100dvh-9.75rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden">
        <PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />

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
          <div className="mt-7 grid items-start gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
            <Card className="flex h-[min(70dvh,46rem)] min-h-[32rem] flex-col overflow-hidden p-2 lg:h-full lg:min-h-0">
              <p className="shrink-0 px-3 py-2 text-xs font-black uppercase tracking-[.08em] text-[var(--muted)]">
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
                  const ownerRole = owner?.roles.includes("super_admin")
                    ? "super_admin"
                    : owner?.roles.includes("admin")
                      ? "admin"
                      : owner
                        ? "user"
                        : "guest";
                  return (
                    <div
                      key={chat.id}
                      className={cn(
                        "group relative h-[6.75rem] w-full border-b p-3 text-left transition-colors duration-200 last:border-b-0",
                        effectiveSelectedId === chat.id
                          ? "bg-[var(--primary-soft)] shadow-[inset_3px_0_0_var(--primary)]"
                          : "hover:bg-[color-mix(in_srgb,var(--surface-muted)_78%,var(--primary-soft))]",
                      )}
                    >
                      <button
                        type="button"
                        className="focus-ring absolute inset-0 z-0 transition active:bg-[var(--primary-soft)]/60"
                        onClick={() => {
                          setSelectedId(chat.id);
                          setSuggestions([]);
                        }}
                        aria-label={`Open chat: ${owner ? userFullName(owner) : (chat.guest?.label ?? t.guest)}`}
                        aria-current={effectiveSelectedId === chat.id ? "true" : undefined}
                      />
                      <div className="pointer-events-none relative z-10">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {owner ? (
                              <Link
                                href={`/admin/users/${owner.id}`}
                                className="pointer-events-auto truncate rounded text-sm font-black transition-colors hover:text-[var(--primary)]"
                              >
                                {userFullName(owner)}
                              </Link>
                            ) : (
                              <p className="truncate text-sm font-black">
                                {chat.guest?.label ?? t.guest}
                              </p>
                            )}
                          </div>
                        <Badge
                          className={cn(
                            "max-w-[8.5rem] shrink-0 truncate",
                            chat.requiresSuperAdmin
                              ? "border-[var(--primary)]/30 bg-[var(--primary-soft)] text-[var(--primary)]"
                              : chat.status === "open"
                                ? "text-amber-700"
                                : chat.status === "active"
                                  ? "text-emerald-700"
                                  : chat.status === "ended"
                                    ? "text-[var(--muted)]"
                                    : null,
                          )}
                        >
                          {chat.requiresSuperAdmin
                            ? `${t.superQueue} · ${statusText}`
                            : statusText}
                        </Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-[var(--muted)]">
                          {owner?.email ?? chat.guest?.email ?? t.guest}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <time
                            className="truncate text-xs text-[var(--muted)]"
                            dateTime={chat.messages.at(-1)?.createdAt ?? chat.updatedAt}
                          >
                            {formatLastMessage(chat)}
                          </time>
                          <span className="shrink-0 text-xs font-bold text-[var(--muted)]">
                            {t.historyRole[ownerRole]}
                          </span>
                        </div>
                      </div>
                    </div>
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

            <Card className="relative flex h-[min(70dvh,46rem)] min-h-[32rem] flex-col overflow-hidden lg:h-full lg:min-h-0">
              {!selected ? (
                <div className="grid flex-1 place-items-center text-sm text-[var(--muted)]">
                  {t.noSelection}
                </div>
              ) : (
                <>
                  <div className="flex min-h-[4.75rem] shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-[var(--surface-muted)] p-4">
                    <div className="flex items-center gap-3">
                      {chatUser && <UserAvatar user={chatUser} />}
                      <div>
                      {chatUser ? (
                        <Link
                          href={`/admin/users/${chatUser.id}`}
                          className="focus-ring rounded font-black hover:text-[var(--primary)]"
                        >
                          {userFullName(chatUser)}
                        </Link>
                      ) : (
                        <p className="font-black">
                          {selected.guest?.label ?? t.guest}
                        </p>
                      )}
                      <p className="text-xs text-[var(--muted)]">
                        {selected.status === "ended"
                          ? t.endedStatus
                          : selected.status === "assistant"
                            ? t.assistantStatus
                            : selected.assignedToName
                              ? t.assigned(firstNameOnly(selected.assignedToName))
                              : t.waiting}
                      </p>
                      </div>
                    </div>
                    {(selected.status === "open" ||
                      (isSuperAdmin &&
                        selected.status === "active" &&
                        !assignedToMe)) && (
                      <Button
                        size="sm"
                        loading={claimMutation.isPending}
                        onClick={() => {
                          if (selected.status === "active") {
                            setConfirmTakeover(true);
                          } else {
                            claimMutation.mutate(selected.id);
                          }
                        }}
                      >
                        <Check className="size-4" />
                        {t.accept}
                      </Button>
                    )}
                  </div>

                  <div className="relative min-h-0 flex-1">
                    <div className="absolute inset-0 overflow-y-auto px-4 pb-4">
                      <DateGroupedMessageList
                        items={selected.messages}
                        formatDate={formatMessageDate}
                        renderItem={(item) => (
                          <ChatMessageBubble
                            direction={
                              item.sender === "staff"
                                ? "outgoing"
                                : item.sender === "system"
                                  ? "system"
                                  : "incoming"
                            }
                            content={
                              item.sender === "system"
                                ? getLocalizedSupportSystemMessage(item.content, locale)
                                : item.content
                            }
                            createdAt={item.createdAt}
                            name={
                            item.sender === "ai" && item.senderName
                              ? getAssistantAgentLabel(item.senderName, locale)
                              : firstNameOnly(item.senderName)
                          }
                          nameHref={
                            item.sender === "user" && chatUser
                              ? `/admin/users/${chatUser.id}`
                              : item.sender === "staff" && item.senderId
                                ? `/admin/users/${item.senderId}`
                                : null
                          }
                          />
                        )}
                      />
                      <div ref={endRef} />
                    </div>
                    {suggestions.length > 0 && (
                      <div className="absolute inset-0 z-20 flex flex-col bg-[var(--surface)]">
                      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              setMessage(suggestion);
                              setSuggestions([]);
                            }}
                            className="focus-ring block w-full whitespace-pre-wrap rounded-2xl border bg-[var(--surface-muted)] p-4 text-left text-sm leading-6 hover:border-[var(--primary)]"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t p-3">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!canReply}
                        loading={suggestionsMutation.isPending}
                        onClick={() => {
                          if (suggestions.length > 0) {
                            setSuggestions([]);
                            return;
                          }
                          suggestionsMutation.mutate(selected.id);
                        }}
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
                        variant="secondary"
                        size="icon"
                        className="size-12 shrink-0 rounded-full"
                        disabled={!canReply || !message.trim()}
                        loading={rewriteMutation.isPending}
                        onClick={() => {
                          const text = message.trim();
                          if (selected && text) {
                            rewriteMutation.mutate({ id: selected.id, text });
                          }
                        }}
                        aria-label={t.improve}
                        title={t.improve}
                      >
                        <WandSparkles className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="size-12 shrink-0 rounded-full"
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

          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirmTakeover}
        onOpenChange={setConfirmTakeover}
        title={t.takeoverTitle}
        description={t.takeoverDescription}
        confirmLabel={t.takeoverConfirm}
        loading={claimMutation.isPending}
        onConfirm={() => {
          if (!selected) return;
          claimMutation.mutate(selected.id, {
            onSuccess: () => setConfirmTakeover(false),
          });
        }}
      />
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
