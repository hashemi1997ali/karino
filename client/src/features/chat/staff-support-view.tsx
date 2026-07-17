"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Check,
  Headphones,
  Lightbulb,
  Send,
  Square,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form-controls";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-provider";
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
  const endRef = useRef<HTMLDivElement>(null);

  const chatsQuery = useQuery({
    queryKey: ["support", "queue"],
    queryFn: () => listStaffChatsRequest(),
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [effectiveSelectedId, selected?.messages.length]);

  const updateCache = (chat: SupportChat) => {
    queryClient.setQueryData<Awaited<ReturnType<typeof listStaffChatsRequest>>>(
      ["support", "queue"],
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
    if (!selected || !text) return;
    sendMutation.mutate({ id: selected.id, text });
  };

  return (
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
        <div className="mt-7 grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)_18rem]">
          <Card className="max-h-[42rem] overflow-y-auto p-2">
            {chats.map((chat) => {
              const owner = typeof chat.user === "string" ? null : chat.user;
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
                      {owner ? `${owner.firstName} ${owner.lastName}` : chat.subject}
                    </p>
                    <Badge
                      className={
                        chat.status === "open" ? "text-amber-700" : "text-emerald-700"
                      }
                    >
                      {chat.status === "open" ? t.waiting : t.active}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--muted)]">
                    {owner?.email ?? chat.subject}
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
          </Card>

          <Card className="flex min-h-[38rem] flex-col overflow-hidden">
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
                        : selected.subject}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {selected.assignedToName
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
                    <div
                      key={item.id}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2.5 text-sm leading-5",
                        item.sender === "staff"
                          ? "ml-auto bg-[var(--primary)] text-white"
                          : item.sender === "system"
                            ? "mx-auto bg-[var(--surface-muted)] text-center text-xs text-[var(--muted)]"
                            : item.sender === "ai"
                              ? "bg-[var(--highlight-soft)]"
                              : "bg-[var(--surface-muted)]",
                      )}
                    >
                      {item.senderName && (
                        <p className="mb-1 text-[10px] font-black uppercase opacity-70">
                          {item.sender === "ai"
                            ? getAssistantAgentLabel(item.senderName, locale)
                            : item.senderName}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap" dir="auto">
                        {item.content}
                      </p>
                    </div>
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
                      disabled={!selected}
                      loading={suggestionsMutation.isPending}
                      onClick={() => suggestionsMutation.mutate(selected.id)}
                    >
                      <Lightbulb className="size-4" />
                      {t.suggestions}
                    </Button>
                    {!isSuperAdmin && assignedToMe && (
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
                    {assignedToMe && (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={endMutation.isPending}
                        onClick={() => endMutation.mutate(selected.id)}
                      >
                        <Square className="size-3" />
                        {t.end}
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      disabled={!assignedToMe}
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
                      disabled={!assignedToMe}
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
                  href={`/admin/tasks?ownerId=${chatUser.id}`}
                  className="focus-ring flex items-center justify-between rounded-xl border p-3 text-xs font-bold hover:border-[var(--primary)]"
                >
                  {t.tasks}
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-xs text-[var(--muted)]">{t.noSelection}</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
