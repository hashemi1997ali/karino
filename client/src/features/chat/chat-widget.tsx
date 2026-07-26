"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CircleStop,
  History,
  MessageCircle,
  Plus,
  Send,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Textarea } from "@/components/ui/form-controls";
import { useAuth } from "@/features/auth/auth-provider";
import {
  createChatRequest,
  endChatRequest,
  endGuestChatRequest,
  getGuestChatRequest,
  guestChatRequest,
  listChatsRequest,
  rateChatRequest,
  sendChatMessageRequest,
  type ChatTurnResult,
} from "@/features/chat/api";
import { ChatMessageBubble } from "@/features/chat/chat-message-bubble";
import { DateGroupedMessageList } from "@/features/chat/date-grouped-message-list";
import { getErrorMessage } from "@/lib/api-error";
import {
  getAssistantAgentLabel,
  getLocalizedSupportSystemMessage,
  isInternalSupportTransferMessage,
} from "@/lib/domain-labels";
import type { ChatMessage, SupportChat } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    title: "AI Assistant",
    subtitle: "AI first, human support when needed",
    open: "Open assistant",
    close: "Close assistant",
    newChat: "New chat",
    history: "Chat history",
    welcome: "Hello! 👋 I'm the AI Assistant. How can I help you today?",
    placeholder: "Write a message…",
    staffPlaceholder: "Ask a question or use /ban, /unban, /user…",
    send: "Send",
    waiting: "Waiting for support",
    active: (name: string) => `${name} is helping you`,
    ended: "This chat has ended.",
    end: "End chat",
    endTitle: "End this chat?",
    endDescription:
      "You can start a new chat afterwards, but this conversation will be closed.",
    newChatTitle: "End this chat and start a new one?",
    newChatDescription:
      "The current conversation will be closed before a new chat is opened.",
    endAndStart: "End and start new",
    signIn:
      "Sign in for account-specific help. Guest conversations can still be transferred to support automatically.",
    signInAction: "Sign in",
    rate: "Rate this chat",
    reason: "What went well or badly?",
    submitRating: "Submit rating",
    rated: "Thanks for your feedback.",
    escalationDone: "The conversation was sent to support.",
    endedDone: "The chat was ended.",
    assistant: "AI Assistant",
    openStatus: "Support queue",
    activeStatus: "Human support",
    endedStatus: "Ended",
  },
  de: {
    title: "AI Assistant",
    subtitle: "Zuerst KI, bei Bedarf menschlicher Support",
    open: "Assistent öffnen",
    close: "Assistent schließen",
    newChat: "Neuer Chat",
    history: "Chatverlauf",
    welcome: "Hallo! 👋 Ich bin der AI Assistant. Wie kann ich dir heute helfen?",
    placeholder: "Nachricht schreiben…",
    staffPlaceholder: "Frage stellen oder /ban, /unban, /user verwenden…",
    send: "Senden",
    waiting: "Wartet auf Support",
    active: (name: string) => `${name} hilft dir`,
    ended: "Dieser Chat ist beendet.",
    end: "Chat beenden",
    endTitle: "Diesen Chat beenden?",
    endDescription:
      "Danach kannst du einen neuen Chat starten, diese Unterhaltung wird jedoch geschlossen.",
    newChatTitle: "Diesen Chat beenden und einen neuen starten?",
    newChatDescription:
      "Die aktuelle Unterhaltung wird geschlossen, bevor ein neuer Chat geöffnet wird.",
    endAndStart: "Beenden und neu starten",
    signIn:
      "Melde dich für kontospezifische Hilfe an. Gast-Chats können trotzdem automatisch an den Support übertragen werden.",
    signInAction: "Anmelden",
    rate: "Chat bewerten",
    reason: "Was war gut oder schlecht?",
    submitRating: "Bewertung senden",
    rated: "Danke für dein Feedback.",
    escalationDone: "Die Unterhaltung wurde an den Support gesendet.",
    endedDone: "Der Chat wurde beendet.",
    assistant: "AI Assistant",
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
  const pathname = usePathname();
  const { locale, intlLocale } = usePreferences();
  const t = copy[locale];
  const { status, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<{
    content: string;
    createdAt: string;
    previousMatchingMessages: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guestChat, setGuestChat] = useState<SupportChat | null>(null);
  const firstNameOnly = (name: string | null | undefined) =>
    name?.trim().split(/\s+/)[0] ?? "";
  const formatMessageDate = (value: string) =>
    new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }).format(
      new Date(value),
    );
  const [endIntent, setEndIntent] = useState<"end" | "new" | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingReason, setRatingReason] = useState("");
  const [welcomeCreatedAt] = useState(() => new Date().toISOString());
  const endRef = useRef<HTMLDivElement>(null);

  const chatsQuery = useQuery({
    queryKey: ["chat", "own"],
    queryFn: listChatsRequest,
    enabled: status === "authenticated",
    refetchInterval: (query) =>
      query.state.data?.some((chat) => chat.status !== "ended") ? 4_000 : false,
  });
  const chats = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data]);
  const selectedChat = chats.find((chat) => chat.id === selectedId) ?? null;

  const guestPollQuery = useQuery({
    queryKey: ["chat", "guest", guestChat?.id],
    queryFn: () => getGuestChatRequest(guestChat!.id),
    enabled:
      status !== "authenticated" &&
      Boolean(guestChat?.id) &&
      guestChat?.status !== "ended",
    refetchInterval: 4_000,
  });

  const activeChat =
    status === "authenticated" ? selectedChat : (guestPollQuery.data ?? guestChat);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages.length, open, pendingUserMessage]);

  const updateChatCache = (chat: SupportChat) => {
    queryClient.setQueryData<SupportChat[]>(["chat", "own"], (current = []) => [
      chat,
      ...current.filter((item) => item.id !== chat.id),
    ]);
    setSelectedId(chat.id);
  };

  const updateGuestChat = (chat: SupportChat) => {
    queryClient.setQueryData<SupportChat>(["chat", "guest", chat.id], chat);
    setGuestChat(chat);
  };

  const handleTurnResult = (result: ChatTurnResult, kind: "guest" | "authenticated") => {
    if (kind === "guest") updateGuestChat(result.chat);
    else updateChatCache(result.chat);
    if (result.escalation.completed) toast.success(t.escalationDone);
  };

  const sendMutation = useMutation<
    { kind: "guest" | "authenticated"; result: ChatTurnResult },
    Error,
    string
  >({
    mutationFn: async (message) => {
      if (status !== "authenticated") {
        return {
          kind: "guest",
          result: await guestChatRequest(
            message,
            locale,
            guestChat?.status === "ended" ? undefined : guestChat?.id,
          ),
        };
      }
      if (!selectedChat || selectedChat.status === "ended") {
        return {
          kind: "authenticated",
          result: await createChatRequest(message, locale),
        };
      }
      return {
        kind: "authenticated",
        result: await sendChatMessageRequest(selectedChat.id, message, locale),
      };
    },
    onSuccess: ({ result, kind }) => {
      setPendingUserMessage(null);
      handleTurnResult(result, kind);
    },
    onError: (error, message) => {
      setPendingUserMessage(null);
      setInput((current) => current || message);
      toast.error(getErrorMessage(error, locale));
    },
  });

  const endMutation = useMutation({
    mutationFn: async (chat: SupportChat) =>
      chat.origin === "guest" ? endGuestChatRequest(chat.id) : endChatRequest(chat.id),
    onSuccess: ({ chat, deleted }) => {
      const shouldStartNew = endIntent === "new";
      if (deleted) {
        if (chat.origin === "guest") {
          queryClient.removeQueries({
            queryKey: ["chat", "guest", chat.id],
            exact: true,
          });
          setGuestChat(null);
        } else {
          queryClient.setQueryData<SupportChat[]>(["chat", "own"], (current = []) =>
            current.filter((item) => item.id !== chat.id),
          );
          setSelectedId(null);
        }
      } else {
        if (chat.origin === "guest") updateGuestChat(chat);
        else updateChatCache(chat);
      }
      if (shouldStartNew && !deleted) {
        if (status === "authenticated") setSelectedId(null);
        else setGuestChat(null);
      }
      setInput("");
      setPendingUserMessage(null);
      setEndIntent(null);
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
    if (!message || disabledInput || sendMutation.isPending) return;
    setPendingUserMessage({
      content: message,
      createdAt: new Date().toISOString(),
      previousMatchingMessages: messages.filter(
        (item) => item.sender === "user" && item.content === message,
      ).length,
    });
    setInput("");
    sendMutation.mutate(message);
  };

  const messages = activeChat?.messages ?? [];
  const visibleMessages = messages.filter(
    (message) =>
      message.sender !== "system" ||
      !isInternalSupportTransferMessage(message.content),
  );
  const pendingMessagePersisted =
    pendingUserMessage !== null &&
    messages.filter(
      (message) =>
        message.sender === "user" && message.content === pendingUserMessage.content,
    ).length > pendingUserMessage.previousMatchingMessages;
  const displayMessages: ChatMessage[] = [
    ...(activeChat
      ? visibleMessages
      : [
          {
            id: "chat-welcome-message",
            sender: "ai" as const,
            senderId: null,
            senderName: t.assistant,
            content: t.welcome,
            createdAt: welcomeCreatedAt,
          },
        ]),
    ...(pendingUserMessage && !pendingMessagePersisted
      ? [
          {
            id: "pending-user-message",
            sender: "user" as const,
            senderId: null,
            senderName: null,
            content: pendingUserMessage.content,
            createdAt: pendingUserMessage.createdAt,
          },
        ]
      : []),
  ];
  const disabledInput = activeChat?.status === "ended";
  const canEnd = Boolean(activeChat && activeChat.status !== "ended");
  const hasMobileNavigation = ["/dashboard", "/tasks", "/account", "/admin"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  const clearForNewChat = () => {
    if (status === "authenticated") setSelectedId(null);
    else setGuestChat(null);
    setInput("");
    setPendingUserMessage(null);
  };

  const requestNewChat = () => {
    if (canEnd) {
      setEndIntent("new");
      return;
    }
    clearForNewChat();
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.open}
          title={t.open}
          className={cn(
            "chat-launcher focus-ring fixed z-40 grid size-14 place-items-center rounded-full border border-white/20 bg-[var(--primary)] text-[var(--on-primary)] shadow-lg transition hover:opacity-90",
            hasMobileNavigation && "chat-launcher-above-nav",
          )}
        >
          <MessageCircle className="size-6" />
        </button>
      )}

      {open && (
        <section className="chat-panel surface-shadow fixed z-40 flex min-h-0 flex-col overflow-hidden rounded-[var(--container-radius)] border bg-[var(--surface)]">
          <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[var(--navigation)] p-4 text-white">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--highlight)] text-[var(--on-highlight)]">
              <Bot className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-black">{t.title}</h2>
              <p className="truncate text-xs text-white/70">
                {activeChat?.status === "active" && activeChat.assignedToName
                  ? t.active(firstNameOnly(activeChat.assignedToName))
                  : activeChat?.status === "open"
                    ? t.waiting
                    : t.subtitle}
              </p>
            </div>
            <button
              type="button"
              className="focus-ring grid size-10 place-items-center rounded-full transition-colors hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label={t.close}
              title={t.close}
            >
              <X className="size-4" />
            </button>
          </header>

          {status === "authenticated" && (
            <div className="flex shrink-0 items-center gap-2 border-b bg-[var(--surface-muted)] p-2">
              <History className="ml-1 size-4 text-[var(--muted)]" />
              <select
                value={selectedId ?? ""}
                onChange={(event) => {
                  const nextId = event.target.value;
                  if (!nextId) requestNewChat();
                  else setSelectedId(nextId);
                }}
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
                onClick={requestNewChat}
                className="focus-ring grid size-11 place-items-center rounded-xl border bg-[var(--surface)]"
                aria-label={t.newChat}
                title={t.newChat}
              >
                <Plus className="size-4" />
              </button>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-4">
            <DateGroupedMessageList
              items={displayMessages}
              formatDate={formatMessageDate}
              renderItem={(message) => (
                <ChatMessageBubble
                  direction={
                    message.sender === "user"
                      ? "outgoing"
                      : message.sender === "system"
                        ? "system"
                        : "incoming"
                  }
                  content={
                    message.sender === "system"
                      ? getLocalizedSupportSystemMessage(message.content, locale)
                      : message.content
                  }
                  createdAt={message.createdAt}
                  name={
                    message.sender === "ai" && message.senderName
                      ? getAssistantAgentLabel(message.senderName, locale)
                      : message.sender === "staff"
                        ? firstNameOnly(message.senderName)
                        : null
                  }
                />
              )}
            />
            {!activeChat && status === "anonymous" && (
              <p className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs leading-5 text-[var(--muted)]">
                {t.signIn}{" "}
                <Link href="/login" className="font-bold text-[var(--primary)]">
                  {t.signInAction}
                </Link>
              </p>
            )}
            {sendMutation.isPending && (
              <ChatMessageBubble direction="incoming" content="•••" />
            )}
            <div ref={endRef} />
          </div>

          {selectedChat?.status === "ended" && !selectedChat.rating && (
            <div className="shrink-0 space-y-2 border-t bg-[var(--surface-muted)] p-3">
              <p className="text-xs font-black">{t.rate}</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setRating(score)}
                    className="focus-ring grid size-11 place-items-center rounded-xl"
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

          <footer className="shrink-0 border-t bg-[var(--surface)] p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
            {canEnd && (
              <div className="mb-2 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={endMutation.isPending}
                  onClick={() => setEndIntent("end")}
                  aria-label={t.end}
                  title={t.end}
                >
                  <CircleStop className="size-4" />
                  {t.end}
                </Button>
              </div>
            )}
            {disabledInput && (
              <Button className="mb-2 w-full" onClick={requestNewChat}>
                <Plus className="size-4" />
                {t.newChat}
              </Button>
            )}
            <div className="flex gap-2">
              <Input
                value={input}
                disabled={disabledInput}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitMessage();
                  }
                }}
                placeholder={
                  disabledInput ? t.ended : isAdmin ? t.staffPlaceholder : t.placeholder
                }
                className="min-w-0"
                dir="auto"
              />
              <Button
                size="icon"
                disabled={disabledInput}
                loading={sendMutation.isPending}
                onClick={submitMessage}
                className="size-12 shrink-0 rounded-full"
                aria-label={t.send}
                title={t.send}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </footer>
        </section>
      )}

      <ConfirmDialog
        open={endIntent !== null}
        onOpenChange={(dialogOpen) => !dialogOpen && setEndIntent(null)}
        title={endIntent === "new" ? t.newChatTitle : t.endTitle}
        description={endIntent === "new" ? t.newChatDescription : t.endDescription}
        confirmLabel={endIntent === "new" ? t.endAndStart : t.end}
        loading={endMutation.isPending}
        onConfirm={() => {
          if (activeChat) endMutation.mutate(activeChat);
        }}
      />
    </>
  );
}
