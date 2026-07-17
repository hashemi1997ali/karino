"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Headphones,
  History,
  MessageCircle,
  Plus,
  Send,
  Square,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form-controls";
import {
  createChatRequest,
  endChatRequest,
  escalateChatRequest,
  guestChatRequest,
  listChatsRequest,
  rateChatRequest,
  sendChatMessageRequest,
  type GuestMessage,
} from "@/features/chat/api";
import { useAuth } from "@/features/auth/auth-provider";
import { getErrorMessage } from "@/lib/api-error";
import { getAssistantAgentLabel } from "@/lib/domain-labels";
import type { SupportChat } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    title: "Karino assistant",
    subtitle: "AI first, human support when needed",
    open: "Open assistant",
    close: "Close assistant",
    newChat: "New chat",
    history: "Chat history",
    empty: "Ask about the website, your account, or how to manage tasks.",
    placeholder: "Write a message…",
    staffPlaceholder: "Ask a question or use /ban, /unban, /user…",
    send: "Send",
    support: "Talk to support",
    superSupport: "Send to super admin",
    waiting: "Waiting for support",
    active: (name: string) => `${name} is helping you`,
    ended: "This chat has ended.",
    end: "End chat",
    signIn: "Sign in for account-specific help and human support.",
    signInAction: "Sign in",
    rate: "Rate this chat",
    reason: "What went well or badly?",
    submitRating: "Submit rating",
    rated: "Thanks for your feedback.",
    escalationDone: "The conversation was sent to support.",
    endedDone: "The chat was ended.",
    assistant: "AI assistant",
    openStatus: "Support queue",
    activeStatus: "Human support",
    endedStatus: "Ended",
  },
  de: {
    title: "Karino-Assistent",
    subtitle: "Zuerst KI, bei Bedarf menschlicher Support",
    open: "Assistent öffnen",
    close: "Assistent schließen",
    newChat: "Neuer Chat",
    history: "Chatverlauf",
    empty: "Frage nach der Website, deinem Konto oder der Aufgabenverwaltung.",
    placeholder: "Nachricht schreiben…",
    staffPlaceholder: "Frage stellen oder /ban, /unban, /user verwenden…",
    send: "Senden",
    support: "Mit Support sprechen",
    superSupport: "An Super-Admin senden",
    waiting: "Wartet auf Support",
    active: (name: string) => `${name} hilft dir`,
    ended: "Dieser Chat ist beendet.",
    end: "Chat beenden",
    signIn: "Melde dich für kontospezifische Hilfe und menschlichen Support an.",
    signInAction: "Anmelden",
    rate: "Chat bewerten",
    reason: "Was war gut oder schlecht?",
    submitRating: "Bewertung senden",
    rated: "Danke für dein Feedback.",
    escalationDone: "Die Unterhaltung wurde an den Support gesendet.",
    endedDone: "Der Chat wurde beendet.",
    assistant: "KI-Assistent",
    openStatus: "Support-Warteschlange",
    activeStatus: "Menschlicher Support",
    endedStatus: "Beendet",
  },
} as const;

const statusLabel = (
  chat: SupportChat,
  t: (typeof copy)["en"] | (typeof copy)["de"],
): string => {
  if (chat.status === "assistant") return t.assistant;
  if (chat.status === "open") return t.openStatus;
  if (chat.status === "active") return t.activeStatus;
  return t.endedStatus;
};

export function ChatWidget() {
  const { locale } = usePreferences();
  const t = copy[locale];
  const { status, isAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guestMessages, setGuestMessages] = useState<GuestMessage[]>([]);
  const [rating, setRating] = useState(5);
  const [ratingReason, setRatingReason] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const chatsQuery = useQuery({
    queryKey: ["chat", "own"],
    queryFn: listChatsRequest,
    enabled: status === "authenticated",
    refetchInterval: (query) =>
      query.state.data?.some((chat) => chat.status === "open" || chat.status === "active")
        ? 4_000
        : false,
  });
  const chats = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data]);
  const selectedChat = chats.find((chat) => chat.id === selectedId) ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages.length, guestMessages.length, open]);

  const updateChatCache = (chat: SupportChat) => {
    queryClient.setQueryData<SupportChat[]>(["chat", "own"], (current = []) => [
      chat,
      ...current.filter((item) => item.id !== chat.id),
    ]);
    setSelectedId(chat.id);
  };

  const sendMutation = useMutation<
    { kind: "guest"; reply: string } | { kind: "chat"; chat: SupportChat },
    Error,
    string
  >({
    mutationFn: async (message: string) => {
      if (status !== "authenticated") {
        const previous = guestMessages;
        setGuestMessages([...previous, { role: "user", content: message }]);
        const result = await guestChatRequest(message, previous, locale);
        return { kind: "guest", reply: result.reply } as const;
      }

      if (!selectedChat || selectedChat.status === "ended") {
        return { kind: "chat", chat: await createChatRequest(message, locale) } as const;
      }

      return {
        kind: "chat",
        chat: await sendChatMessageRequest(selectedChat.id, message, locale),
      } as const;
    },
    onSuccess: (result) => {
      if (result.kind === "guest") {
        setGuestMessages((current) => [
          ...current,
          { role: "assistant", content: result.reply },
        ]);
        return;
      }
      updateChatCache(result.chat);
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const escalateMutation = useMutation({
    mutationFn: (id: string) => escalateChatRequest(id),
    onSuccess: (chat) => {
      updateChatCache(chat);
      toast.success(t.escalationDone);
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const endMutation = useMutation({
    mutationFn: (id: string) => endChatRequest(id),
    onSuccess: (chat) => {
      updateChatCache(chat);
      toast.success(t.endedDone);
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const rateMutation = useMutation({
    mutationFn: ({ id, score, reason }: { id: string; score: number; reason: string }) =>
      rateChatRequest(id, score, reason),
    onSuccess: (chat) => {
      updateChatCache(chat);
      setRatingReason("");
      toast.success(t.rated);
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  const submitMessage = () => {
    const message = input.trim();
    if (!message || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(message);
  };

  const displayedMessages =
    status === "authenticated"
      ? (selectedChat?.messages ?? []).map((message) => ({
          role:
            message.sender === "user"
              ? ("user" as const)
              : message.sender === "system"
                ? ("system" as const)
                : ("assistant" as const),
          content: message.content,
          name:
            message.sender === "ai" && message.senderName
              ? getAssistantAgentLabel(message.senderName, locale)
              : message.senderName,
          id: message.id,
        }))
      : guestMessages.map((message, index) => ({
          ...message,
          name: message.role === "assistant" ? t.assistant : null,
          id: `guest-${index}`,
        }));

  const canEscalate =
    status === "authenticated" && selectedChat?.status === "assistant" && !isSuperAdmin;
  const canEnd =
    status === "authenticated" && selectedChat && selectedChat.status !== "ended";
  const disabledInput = selectedChat?.status === "ended";

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.open}
          className="focus-ring fixed right-4 bottom-24 z-40 grid size-14 place-items-center rounded-full border border-white/20 bg-[var(--primary)] text-white shadow-[0_10px_30px_rgba(241,90,56,.35)] transition hover:-translate-y-1 lg:right-6 lg:bottom-6"
        >
          <MessageCircle className="size-6" />
        </button>
      )}

      {open && (
        <section className="surface-shadow fixed right-3 bottom-24 z-40 flex h-[min(72vh,42rem)] w-[min(calc(100vw-1.5rem),25rem)] flex-col overflow-hidden rounded-[1.7rem] border bg-[var(--surface)] lg:right-6 lg:bottom-6">
          <header className="flex items-center gap-3 bg-[#171a18] px-4 py-3 text-white">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--highlight)] text-[#171a18]">
              <Bot className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-black">{t.title}</h2>
              <p className="truncate text-[11px] text-white/55">
                {selectedChat?.status === "active" && selectedChat.assignedToName
                  ? t.active(selectedChat.assignedToName)
                  : selectedChat?.status === "open"
                    ? t.waiting
                    : t.subtitle}
              </p>
            </div>
            <button
              type="button"
              className="focus-ring grid size-9 place-items-center rounded-full hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label={t.close}
            >
              <X className="size-4" />
            </button>
          </header>

          {status === "authenticated" && (
            <div className="flex items-center gap-2 border-b bg-[var(--surface-muted)] p-2">
              <History className="ml-1 size-4 text-[var(--muted)]" />
              <select
                value={selectedId ?? ""}
                onChange={(event) => setSelectedId(event.target.value || null)}
                aria-label={t.history}
                className="focus-ring min-w-0 flex-1 rounded-xl border bg-[var(--surface)] px-2 py-2 text-xs font-bold"
              >
                <option value="">{t.newChat}</option>
                {chats.map((chat) => (
                  <option key={chat.id} value={chat.id}>
                    {chat.subject.slice(0, 34)} · {statusLabel(chat, t)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="focus-ring grid size-9 place-items-center rounded-xl border bg-[var(--surface)]"
                aria-label={t.newChat}
              >
                <Plus className="size-4" />
              </button>
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {displayedMessages.length === 0 && (
              <div className="grid min-h-44 place-items-center text-center">
                <div>
                  <Bot className="mx-auto size-9 text-[var(--primary)]" />
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.empty}</p>
                  {status === "anonymous" && (
                    <p className="mt-3 rounded-xl bg-[var(--surface-muted)] p-3 text-xs leading-5 text-[var(--muted)]">
                      {t.signIn}{" "}
                      <Link href="/login" className="font-bold text-[var(--primary)]">
                        {t.signInAction}
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            )}

            {displayedMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-5",
                  message.role === "user"
                    ? "ml-auto bg-[var(--primary)] text-white"
                    : message.role === "system"
                      ? "mx-auto max-w-[95%] bg-[var(--surface-muted)] text-center text-xs text-[var(--muted)]"
                      : "bg-[var(--surface-muted)] text-[var(--foreground)]",
                )}
              >
                {message.role === "assistant" && message.name && (
                  <p className="mb-1 text-[10px] font-black tracking-wide text-[var(--primary)] uppercase">
                    {message.name}
                  </p>
                )}
                <p className="whitespace-pre-wrap" dir="auto">
                  {message.content}
                </p>
              </div>
            ))}
            {sendMutation.isPending && (
              <div className="w-fit rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-xs text-[var(--muted)]">
                •••
              </div>
            )}
            <div ref={endRef} />
          </div>

          {selectedChat?.status === "ended" && !selectedChat.rating && (
            <div className="space-y-2 border-t bg-[var(--surface-muted)] p-3">
              <p className="text-xs font-black">{t.rate}</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setRating(score)}
                    className="focus-ring rounded p-1"
                    aria-label={`${score}`}
                  >
                    <Star
                      className={cn(
                        "size-5",
                        score <= rating && "fill-current text-amber-500",
                      )}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                value={ratingReason}
                onChange={(event) => setRatingReason(event.target.value)}
                placeholder={t.reason}
                className="min-h-16 text-xs"
              />
              <Button
                size="sm"
                loading={rateMutation.isPending}
                onClick={() =>
                  rateMutation.mutate({
                    id: selectedChat.id,
                    score: rating,
                    reason: ratingReason,
                  })
                }
              >
                {t.submitRating}
              </Button>
            </div>
          )}

          <footer className="border-t p-3">
            {(canEscalate || canEnd) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {canEscalate && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={escalateMutation.isPending}
                    onClick={() => escalateMutation.mutate(selectedChat!.id)}
                  >
                    <Headphones className="size-4" />
                    {isAdmin ? t.superSupport : t.support}
                  </Button>
                )}
                {canEnd && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={endMutation.isPending}
                    onClick={() => endMutation.mutate(selectedChat!.id)}
                  >
                    <Square className="size-3" />
                    {t.end}
                  </Button>
                )}
              </div>
            )}
            {disabledInput ? (
              <Button className="w-full" onClick={() => setSelectedId(null)}>
                <Plus className="size-4" />
                {t.newChat}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitMessage();
                    }
                  }}
                  placeholder={isAdmin ? t.staffPlaceholder : t.placeholder}
                  className="h-11"
                  dir="auto"
                />
                <Button
                  size="icon"
                  loading={sendMutation.isPending}
                  onClick={submitMessage}
                  aria-label={t.send}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            )}
          </footer>
        </section>
      )}
    </>
  );
}
