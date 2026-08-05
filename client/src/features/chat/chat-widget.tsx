"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bot,
  CircleStop,
  Headset,
  History,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Star,
  TicketCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/form-controls";
import { avatarFrameClassName } from "@/components/user-avatar";
import { useAuth } from "@/features/auth/auth-provider";
import {
  createChatRequest,
  createGuestSupportChatRequest,
  createSupportChatRequest,
  endChatRequest,
  endGuestChatRequest,
  getGuestChatRequest,
  guestChatRequest,
  listChatsRequest,
  rateChatRequest,
  sendGuestMessageRequest,
  sendChatMessageRequest,
  type AssistantChatTurnResult,
  type ChatHistoryItem,
} from "@/features/chat/api";
import { ChatMessageBubble } from "@/features/chat/chat-message-bubble";
import { ChatIconButton } from "@/features/chat/chat-icon-button";
import { DateGroupedMessageList } from "@/features/chat/date-grouped-message-list";
import {
  ASSISTANT_SUPPORT_EVENT,
  TICKET_SUPPORT_EVENT,
  type AssistantSupportRequest,
  type TicketSupportRequest,
} from "@/features/chat/ticket-support-event";
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
    subtitle: "AI guidance with live support available",
    guestSubtitle: "General website guidance",
    open: "Open assistant",
    close: "Close assistant",
    newChat: "New chat",
    history: "Chat history",
    welcome: "Hello! I'm the AI Assistant. How can I help you today?",
    placeholder: "Write a message…",
    staffPlaceholder: "Ask Karino Desk a question…",
    send: "Send",
    waiting: "Waiting for support",
    active: (name: string) => `${name} is helping you`,
    secure: "Private support channel",
    ended: "This chat has ended.",
    end: "End chat",
    endTitle: "End this chat?",
    endDescription:
      "You can start a new chat afterwards, but this conversation will be closed.",
    liveChat: "Continue with live support",
    rate: "Rate this chat",
    reason: "What went well or badly?",
    submitRating: "Submit rating",
    rated: "Thanks for your feedback.",
    escalationDone: "The conversation was sent to support.",
    supportReady: "A human agent will receive this conversation with its context.",
    endedDone: "The chat was ended.",
    assistant: "AI Assistant",
    openStatus: "Support queue",
    activeStatus: "Human support",
    endedStatus: "Ended",
    linkedTicket: "Linked ticket",
    composerHint: "Enter to send · Shift + Enter for a new line",
    ticketMessage: (ticketNumber: string, title: string) =>
      `I need live support with ${ticketNumber}: ${title}`,
  },
  de: {
    title: "AI Assistant",
    subtitle: "KI-Hilfe mit verfügbarem Live-Support",
    guestSubtitle: "Allgemeine Website-Hilfe",
    open: "Assistent öffnen",
    close: "Assistent schließen",
    newChat: "Neuer Chat",
    history: "Chatverlauf",
    welcome: "Hallo! Ich bin der AI Assistant. Wie kann ich dir heute helfen?",
    placeholder: "Nachricht schreiben…",
    staffPlaceholder: "Stelle Karino Desk eine Frage…",
    send: "Senden",
    waiting: "Wartet auf Support",
    active: (name: string) => `${name} hilft dir`,
    secure: "Privater Support-Kanal",
    ended: "Dieser Chat ist beendet.",
    end: "Chat beenden",
    endTitle: "Diesen Chat beenden?",
    endDescription:
      "Danach kannst du einen neuen Chat starten, diese Unterhaltung wird jedoch geschlossen.",
    liveChat: "Mit Live-Support fortfahren",
    rate: "Chat bewerten",
    reason: "Was war gut oder schlecht?",
    submitRating: "Bewertung senden",
    rated: "Danke für dein Feedback.",
    escalationDone: "Die Unterhaltung wurde an den Support gesendet.",
    supportReady:
      "Ein Support-Agent erhält diese Unterhaltung mit dem vollständigen Kontext.",
    endedDone: "Der Chat wurde beendet.",
    assistant: "AI Assistant",
    openStatus: "Support-Warteschlange",
    activeStatus: "Menschlicher Support",
    endedStatus: "Beendet",
    linkedTicket: "Verknüpftes Ticket",
    composerHint: "Enter zum Senden · Umschalt + Enter für eine neue Zeile",
    ticketMessage: (ticketNumber: string, title: string) =>
      `Ich brauche Live-Support für ${ticketNumber}: ${title}`,
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
  const [draftMessages, setDraftMessages] = useState<ChatMessage[]>([]);
  const [supportOffer, setSupportOffer] = useState<
    AssistantChatTurnResult["support"] | null
  >(null);
  const firstNameOnly = (name: string | null | undefined) =>
    name?.trim().split(/\s+/)[0] ?? "";
  const formatMessageDate = (value: string) =>
    new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }).format(new Date(value));
  const [endIntent, setEndIntent] = useState<"end" | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingReason, setRatingReason] = useState("");
  const [welcomeCreatedAt, setWelcomeCreatedAt] = useState(() =>
    new Date().toISOString(),
  );
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
  const transcriptHistory: ChatHistoryItem[] = draftMessages
    .filter(
      (item) =>
        (item.sender === "user" || item.sender === "ai") &&
        item.content.trim().length > 0,
    )
    .slice(-40)
    .map((item) => ({
      role: item.sender === "user" ? "user" : "assistant",
      content: item.content,
    }));
  const assistantHistory = transcriptHistory.slice(-20);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages.length, draftMessages.length, open, pendingUserMessage]);

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

  const invalidateTicketCaches = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tickets"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
    ]);
  };

  const sendMutation = useMutation<
    | {
        kind: "assistant";
        result: AssistantChatTurnResult;
        userMessage: ChatMessage;
      }
    | { kind: "support"; chat: SupportChat },
    Error,
    { message: string; createdAt: string }
  >({
    mutationFn: async ({ message, createdAt }) => {
      if (activeChat?.status === "open" || activeChat?.status === "active") {
        const chat =
          activeChat.origin === "guest"
            ? await sendGuestMessageRequest(activeChat.id, message)
            : (await sendChatMessageRequest(activeChat.id, message, locale)).chat;
        return { kind: "support" as const, chat };
      }
      const result =
        status !== "authenticated"
          ? await guestChatRequest(message, locale, assistantHistory)
          : await createChatRequest(message, locale, assistantHistory);
      return {
        kind: "assistant" as const,
        result,
        userMessage: {
          id: `local-user-${createdAt}`,
          sender: "user" as const,
          senderId: null,
          senderName: null,
          content: message,
          createdAt,
        },
      };
    },
    onSuccess: (payload) => {
      setPendingUserMessage(null);
      if (payload.kind === "support") {
        if (payload.chat.origin === "guest") updateGuestChat(payload.chat);
        else updateChatCache(payload.chat);
        if (payload.chat.ticketId) invalidateTicketCaches();
        return;
      }
      setDraftMessages((current) => [
        ...current,
        payload.userMessage,
        ...(payload.result.message.content.trim() ? [payload.result.message] : []),
      ]);
      setSupportOffer(payload.result.support.available ? payload.result.support : null);
    },
    onError: (error, { message }) => {
      setPendingUserMessage(null);
      setInput((current) => current || message);
      toast.error(getErrorMessage(error, locale));
    },
  });

  const transferMutation = useMutation<
    { kind: "guest" | "authenticated"; chat: SupportChat },
    Error,
    { ticket?: TicketSupportRequest; history?: ChatHistoryItem[] } | undefined
  >({
    mutationFn: async (intent) => {
      const reason = supportOffer?.reason ?? "human_requested";
      const history = intent?.history ?? transcriptHistory;
      if (status !== "authenticated") {
        return {
          kind: "guest" as const,
          chat: await createGuestSupportChatRequest(history, locale, reason),
        };
      }
      return {
        kind: "authenticated" as const,
        chat: await createSupportChatRequest(history, locale, reason, intent?.ticket?.id),
      };
    },
    onSuccess: ({ chat, kind }) => {
      if (kind === "guest") updateGuestChat(chat);
      else updateChatCache(chat);
      setDraftMessages([]);
      setSupportOffer(null);
      if (chat.ticketId) invalidateTicketCaches();
      toast.success(t.escalationDone);
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });

  useEffect(() => {
    const handleTicketSupport = (event: Event) => {
      if (status !== "authenticated") return;
      const ticket = (event as CustomEvent<TicketSupportRequest>).detail;
      if (!ticket?.id) return;
      const content = t.ticketMessage(ticket.ticketNumber, ticket.title);
      const createdAt = new Date().toISOString();
      const history: ChatHistoryItem[] = [{ role: "user", content }];
      setOpen(true);
      setSelectedId(null);
      setInput("");
      setSupportOffer(null);
      setDraftMessages([
        {
          id: `ticket-support-${createdAt}`,
          sender: "user",
          senderId: null,
          senderName: null,
          content,
          createdAt,
        },
      ]);
      transferMutation.mutate({ ticket, history });
    };
    window.addEventListener(TICKET_SUPPORT_EVENT, handleTicketSupport);
    return () => window.removeEventListener(TICKET_SUPPORT_EVENT, handleTicketSupport);
  }, [status, t, transferMutation]);

  useEffect(() => {
    const handleAssistantSupport = (event: Event) => {
      if (status !== "authenticated") return;
      const request = (event as CustomEvent<AssistantSupportRequest>).detail;
      const history = request?.history
        ?.filter((item) => item.content.trim().length > 0)
        .slice(-40);
      if (!request?.conversationId || !history?.length) return;

      const createdAt = new Date().toISOString();
      setOpen(true);
      setSelectedId(null);
      setInput("");
      setSupportOffer(null);
      setDraftMessages(
        history.map((item, index) => ({
          id: `assistant-handoff-${request.conversationId}-${index}`,
          sender: item.role === "user" ? "user" : "ai",
          senderId: null,
          senderName: item.role === "assistant" ? t.assistant : null,
          content: item.content,
          createdAt,
        })),
      );
      transferMutation.mutate({ history });
    };
    window.addEventListener(ASSISTANT_SUPPORT_EVENT, handleAssistantSupport);
    return () =>
      window.removeEventListener(ASSISTANT_SUPPORT_EVENT, handleAssistantSupport);
  }, [status, t, transferMutation]);

  const endMutation = useMutation({
    mutationFn: async (chat: SupportChat) =>
      chat.origin === "guest" ? endGuestChatRequest(chat.id) : endChatRequest(chat.id),
    onSuccess: ({ chat, deleted }) => {
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
      setInput("");
      setPendingUserMessage(null);
      setEndIntent(null);
      if (chat.ticketId) invalidateTicketCaches();
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
    const createdAt = new Date().toISOString();
    setPendingUserMessage({
      content: message,
      createdAt,
      previousMatchingMessages: messages.filter(
        (item) => item.sender === "user" && item.content === message,
      ).length,
    });
    setInput("");
    sendMutation.mutate({ message, createdAt });
  };

  const messages = activeChat?.messages ?? draftMessages;
  const visibleMessages = messages.filter(
    (message) =>
      message.sender !== "system" || !isInternalSupportTransferMessage(message.content),
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
          ...visibleMessages,
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
  const canEnd = activeChat?.status === "active";
  const hasMobileNavigation = [
    "/dashboard",
    "/tickets",
    "/assistant",
    "/account",
    "/admin",
  ].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const clearForNewChat = () => {
    if (status === "authenticated") setSelectedId(null);
    else setGuestChat(null);
    setDraftMessages([]);
    setSupportOffer(null);
    setWelcomeCreatedAt(new Date().toISOString());
    setInput("");
    setPendingUserMessage(null);
  };

  const requestNewChat = () => clearForNewChat();

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.open}
          title={t.open}
          className={cn(
            "chat-launcher focus-ring group fixed z-40 grid size-14 place-items-center rounded-2xl border border-white/20 bg-[linear-gradient(145deg,var(--primary),var(--primary-dark))] text-[var(--on-primary)] shadow-[0_18px_48px_var(--primary-glow)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_24px_54px_var(--primary-glow)]",
            hasMobileNavigation && "chat-launcher-above-nav",
          )}
        >
          <MessageCircle className="size-6 transition-transform group-hover:scale-105" />
          <span
            className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--surface)] bg-[var(--success)]"
            aria-hidden="true"
          />
        </button>
      )}

      {open && (
        <section className="chat-panel desk-panel surface-shadow fixed z-40 flex min-h-0 flex-col overflow-hidden rounded-[var(--container-radius)] border border-[color-mix(in_srgb,var(--primary)_20%,var(--border))] bg-[var(--surface)] shadow-[var(--shadow-float)]">
          <header className="desk-grid-glow relative flex min-h-18 shrink-0 items-center gap-3 overflow-hidden border-b bg-[color-mix(in_srgb,var(--surface)_88%,var(--primary-soft))] px-3 py-2.5 text-[var(--foreground)]">
            <div className="pointer-events-none absolute -top-16 right-10 size-28 rounded-full bg-[var(--primary-glow)] blur-2xl" />
            <span
              className={cn(
                avatarFrameClassName("text-[var(--primary)]"),
                "relative border border-[color-mix(in_srgb,var(--primary)_20%,var(--border))] bg-[var(--surface)] shadow-sm",
              )}
              aria-label={t.title}
            >
              <Bot className="size-5" />
            </span>
            <div className="relative min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-semibold tracking-[-0.01em]">
                  {t.title}
                </h2>
                <span className="desk-live-dot size-1.5 shrink-0 rounded-full bg-[var(--success)]" />
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[0.6875rem] font-medium text-[var(--muted)]">
                <ShieldCheck className="size-3 shrink-0 text-[var(--success)]" />
                <span className="truncate">
                  {activeChat?.status === "active" && activeChat.assignedToName
                    ? t.active(firstNameOnly(activeChat.assignedToName))
                    : activeChat?.status === "open"
                      ? t.waiting
                      : status === "anonymous"
                        ? t.guestSubtitle
                        : t.secure}
                </span>
              </p>
            </div>
            <ChatIconButton
              onClick={() => setOpen(false)}
              aria-label={t.close}
              title={t.close}
            >
              <X className="size-4" />
            </ChatIconButton>
          </header>

          {status === "authenticated" && (
            <div className="desk-toolbar flex shrink-0 items-center gap-2 border-b bg-[color-mix(in_srgb,var(--surface-muted)_68%,var(--surface))] p-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-[var(--muted)] shadow-sm">
                <History className="size-4" />
              </span>
              <select
                value={selectedId ?? ""}
                onChange={(event) => {
                  const nextId = event.target.value;
                  if (!nextId) requestNewChat();
                  else setSelectedId(nextId);
                }}
                aria-label={t.history}
                className="focus-ring h-10 min-w-0 flex-1 rounded-xl border bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--foreground)]"
              >
                <option value="">{t.newChat}</option>
                {chats.map((chat) => (
                  <option key={chat.id} value={chat.id}>
                    {chat.subject.slice(0, 34)} · {statusLabel(chat, t)}
                  </option>
                ))}
              </select>
              <ChatIconButton
                onClick={requestNewChat}
                aria-label={t.newChat}
                title={t.newChat}
              >
                <Plus className="size-4" />
              </ChatIconButton>
            </div>
          )}
          {status !== "authenticated" && (
            <div className="desk-toolbar flex shrink-0 items-center justify-between border-b bg-[color-mix(in_srgb,var(--surface-muted)_68%,var(--surface))] px-3 py-2">
              <span className="text-[0.6875rem] font-medium text-[var(--muted)]">
                {t.guestSubtitle}
              </span>
              <ChatIconButton
                onClick={requestNewChat}
                aria-label={t.newChat}
                title={t.newChat}
              >
                <Plus className="size-4" />
              </ChatIconButton>
            </div>
          )}

          {activeChat?.linkedTicket && (
            <Link
              href={`/tickets?search=${encodeURIComponent(activeChat.linkedTicket.ticketNumber || activeChat.linkedTicket.id)}`}
              className="focus-ring group flex min-h-12 shrink-0 items-center gap-2.5 border-b bg-[color-mix(in_srgb,var(--primary-soft)_44%,var(--surface))] px-3 py-2 text-xs transition-colors hover:bg-[var(--primary-soft)]"
              aria-label={`${t.linkedTicket}: ${activeChat.linkedTicket.ticketNumber}`}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-[var(--primary)] shadow-sm">
                <TicketCheck className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[0.625rem] font-bold text-[var(--primary)]">
                  {activeChat.linkedTicket.ticketNumber}
                </span>
                <span className="mt-0.5 block truncate font-semibold">
                  {activeChat.linkedTicket.title}
                </span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-[var(--muted)] transition-colors group-hover:text-[var(--primary)]" />
            </Link>
          )}

          <div className="desk-grid-glow flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--surface)_86%,var(--background))] px-3 pb-4 sm:px-4">
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
                  markdown={message.sender === "ai"}
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
            {sendMutation.isPending && (
              <ChatMessageBubble
                direction="incoming"
                content=""
                typing
                name={t.assistant}
              />
            )}
            <div ref={endRef} />
          </div>

          {selectedChat?.status === "ended" && !selectedChat.rating && (
            <div className="desk-panel-soft shrink-0 space-y-2 border-t bg-[color-mix(in_srgb,var(--surface-muted)_72%,var(--surface))] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold">{t.rate}</p>
                <span className="text-xs font-bold text-amber-500 tabular-nums">
                  {rating}/5
                </span>
              </div>
              <div className="flex gap-1" role="group" aria-label={t.rate}>
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setRating(score)}
                    className="focus-ring grid size-10 place-items-center rounded-xl transition-colors hover:bg-[var(--surface)]"
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

          <footer className="shrink-0 border-t bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-3 shadow-[0_-12px_32px_rgba(15,23,42,.04)] backdrop-blur-xl pb-[max(.75rem,env(safe-area-inset-bottom))]">
            {!activeChat && supportOffer?.available && (
              <div className="mb-3 rounded-2xl border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--primary-soft)_46%,var(--surface))] p-3">
                <div className="mb-2.5 flex items-start gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-[var(--primary)] shadow-sm">
                    <Headset className="size-4" />
                  </span>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    {t.supportReady}
                  </p>
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  loading={transferMutation.isPending}
                  disabled={transcriptHistory.length === 0}
                  onClick={() => transferMutation.mutate(undefined)}
                >
                  <ArrowUpRight className="size-4" />
                  {t.liveChat}
                </Button>
              </div>
            )}
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
            <div className="flex items-end gap-2 rounded-2xl border bg-[var(--surface)] p-2 shadow-sm transition-[border-color,box-shadow] focus-within:border-[color-mix(in_srgb,var(--primary)_58%,var(--border))] focus-within:shadow-[0_0_0_3px_var(--primary-glow)]">
              <textarea
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
                rows={1}
                className="max-h-28 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-base leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-55 sm:text-sm"
                dir="auto"
              />
              <Button
                size="icon"
                disabled={disabledInput || !input.trim()}
                loading={sendMutation.isPending}
                onClick={submitMessage}
                className="size-11 shrink-0 rounded-xl"
                aria-label={t.send}
                title={t.send}
              >
                <Send className="size-4" />
              </Button>
            </div>
            {!disabledInput && (
              <p className="mt-2 px-1 text-[0.625rem] font-medium text-[var(--muted)]">
                {t.composerHint}
              </p>
            )}
          </footer>
        </section>
      )}

      <ConfirmDialog
        open={endIntent !== null}
        onOpenChange={(dialogOpen) => !dialogOpen && setEndIntent(null)}
        title={t.endTitle}
        description={t.endDescription}
        confirmLabel={t.end}
        loading={endMutation.isPending}
        onConfirm={() => {
          if (activeChat) endMutation.mutate(activeChat);
        }}
      />
    </>
  );
}
