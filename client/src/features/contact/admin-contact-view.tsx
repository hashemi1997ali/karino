"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Mail,
  MailCheck,
  WandSparkles,
} from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { FormStatusBadge } from "@/components/ui/domain-badge";
import { UserAvatar } from "@/components/user-avatar";
import { PageHeading } from "@/components/ui/page-heading";
import { ChatWorkspaceSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ChatMessageBubble } from "@/features/chat/chat-message-bubble";
import { ChatHistoryItem } from "@/features/chat/chat-history-item";
import { ChatIconButton } from "@/features/chat/chat-icon-button";
import { ChatComposer, ChatToolButton } from "@/features/chat/chat-composer";
import { ChatSuggestionPanel } from "@/features/chat/chat-suggestion-panel";
import { ChatThreadHeader } from "@/features/chat/chat-thread-header";
import { DateGroupedMessageList } from "@/features/chat/date-grouped-message-list";
import {
  getContactReplySuggestionsRequest,
  listContactSubmissionsRequest,
  replyToContactRequest,
  rewriteContactReplyRequest,
} from "@/features/contact/api";
import { getErrorMessage } from "@/lib/api-error";
import type { ContactSubmission } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    eyebrow: "Contact form",
    title: "Contact inbox",
    description: "Review contact messages and reply by email.",
    loading: "Loading contact messages…",
    empty: "There are no contact messages yet.",
    back: "Back to messages",
    open: "Open",
    answered: "Answered",
    noSelection: "Select a contact message from the inbox.",
    reply: "Write an email reply…",
    send: "Send email reply",
    sent: "The reply was emailed and added to this conversation.",
    contactDetails: "Submitted contact details",
    created: "Received",
    delivery: "Sent by email",
    previous: "Previous",
    next: "Next",
    page: "Page",
    suggestions: "Suggested replies",
    hideSuggestions: "Hide suggested replies",
    improve: "Improve as email",
    improved: "The draft was expanded into a complete email.",
    history: "All form history",
  },
  de: {
    eyebrow: "Kontaktformular",
    title: "Kontakt-Posteingang",
    description: "Kontaktnachrichten lesen und per E-Mail beantworten.",
    loading: "Kontaktnachrichten werden geladen…",
    empty: "Es gibt noch keine Kontaktnachrichten.",
    back: "Zurück zu Nachrichten",
    open: "Offen",
    answered: "Beantwortet",
    noSelection: "Wähle eine Nachricht aus dem Posteingang.",
    reply: "E-Mail-Antwort schreiben…",
    send: "Antwort per E-Mail senden",
    sent: "Die Antwort wurde per E-Mail gesendet und hier gespeichert.",
    contactDetails: "Eingegebene Kontaktdaten",
    created: "Empfangen",
    delivery: "Per E-Mail gesendet",
    previous: "Zurück",
    next: "Weiter",
    page: "Seite",
    suggestions: "Antwortvorschläge",
    hideSuggestions: "Antwortvorschläge ausblenden",
    improve: "Als E-Mail verbessern",
    improved: "Der Entwurf wurde zu einer vollständigen E-Mail erweitert.",
    history: "Gesamter Formularverlauf",
  },
} as const;

const firstNameOnly = (name: string) => name.trim().split(/\s+/)[0] || name;

export function AdminContactView() {
  const { locale, intlLocale } = usePreferences();
  const t = copy[locale];
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesRef = useRef<HTMLDivElement>(null);
  const queryKey = ["admin", "contact", page] as const;
  const contactsQuery = useQuery({
    queryKey,
    queryFn: () => listContactSubmissionsRequest(page),
    refetchInterval: 8_000,
  });
  const contacts = useMemo(
    () => contactsQuery.data?.contacts ?? [],
    [contactsQuery.data?.contacts],
  );
  const effectiveSelectedId =
    selectedId && contacts.some((contact) => contact.id === selectedId)
      ? selectedId
      : (contacts[0]?.id ?? null);
  const selected = contacts.find((contact) => contact.id === effectiveSelectedId) ?? null;
  const formatMessageDate = (value: string) =>
    new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }).format(new Date(value));
  const formatLastMessage = (contact: ContactSubmission) =>
    new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(contact.messages.at(-1)?.createdAt ?? contact.updatedAt));

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const messages = messagesRef.current;
      if (messages) messages.scrollTop = messages.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [effectiveSelectedId, mobileThreadOpen, selected?.messages.length]);

  const updateCache = (contact: ContactSubmission) => {
    queryClient.setQueryData<Awaited<ReturnType<typeof listContactSubmissionsRequest>>>(
      queryKey,
      (current) =>
        current
          ? {
              ...current,
              contacts: current.contacts.map((item) =>
                item.id === contact.id ? contact : item,
              ),
            }
          : current,
    );
  };
  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      replyToContactRequest(id, message),
    onSuccess: (contact) => {
      updateCache(contact);
      setReply("");
      setSuggestions([]);
      toast.success(t.sent);
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });
  const suggestionsMutation = useMutation({
    mutationFn: (id: string) => getContactReplySuggestionsRequest(id),
    onSuccess: setSuggestions,
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });
  const rewriteMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      rewriteContactReplyRequest(id, message),
    onSuccess: (message) => {
      setReply(message);
      toast.success(t.improved);
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });
  const sendReply = () => {
    const message = reply.trim();
    if (!selected || !message || replyMutation.isPending) return;
    replyMutation.mutate({ id: selected.id, message });
  };
  const threadOpen = mobileThreadOpen || contacts.length === 0;

  return (
    <div className="md:flex md:h-[calc(100dvh-3rem)] md:min-h-0 md:flex-col md:overflow-hidden lg:h-[calc(100dvh-4rem)]">
      <PageHeading title={t.title} description={t.description} />

      {contactsQuery.isPending ? (
        <ChatWorkspaceSkeleton />
      ) : contactsQuery.isError ? (
        <div>
          <ErrorState
            message={getErrorMessage(contactsQuery.error, locale)}
            retry={() => void contactsQuery.refetch()}
          />
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState icon={Mail} title={t.empty} />
      ) : (
        <div
          className={cn(
            "chat-workspace grid min-h-[38rem] overflow-hidden rounded-[var(--container-radius)] md:min-h-0 md:flex-1 xl:grid-cols-[18rem_minmax(0,1fr)]",
            threadOpen &&
              "max-md:fixed max-md:inset-0 max-md:z-50 max-md:mt-0 max-md:h-dvh max-md:min-h-0 max-md:rounded-none max-md:border-0",
          )}
        >
          <aside
            className={cn(
              "min-h-0 min-w-0 flex-col border-r",
              threadOpen ? "max-xl:hidden xl:flex" : "flex",
            )}
          >
            <div className="chat-section-header flex h-16 shrink-0 items-center px-4">
              <h2 className="text-sm font-semibold">{t.history}</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {contacts.map((contact) => (
                <ChatHistoryItem
                  key={contact.id}
                  selected={effectiveSelectedId === contact.id}
                  title={`${contact.firstName} ${contact.lastName}`}
                  date={formatLastMessage(contact)}
                  dateTime={contact.updatedAt}
                  topBadge={
                    <FormStatusBadge status={contact.status}>
                      {contact.status === "open" ? t.open : t.answered}
                    </FormStatusBadge>
                  }
                  onClick={() => {
                    setSelectedId(contact.id);
                    setSuggestions([]);
                    setReply("");
                    setMobileThreadOpen(true);
                  }}
                  aria-label={`Open form: ${contact.firstName} ${contact.lastName}`}
                  aria-current={effectiveSelectedId === contact.id ? "true" : undefined}
                />
              ))}
            </div>
            {contactsQuery.data && contactsQuery.data.pagination.totalPages > 1 && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-t p-2 text-xs">
                <ChatIconButton
                  disabled={!contactsQuery.data.pagination.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  aria-label={t.previous}
                  title={t.previous}
                >
                  <ChevronLeft className="size-4" />
                </ChatIconButton>
                <span className="text-[var(--muted)]">
                  {t.page} {contactsQuery.data.pagination.page} /{" "}
                  {contactsQuery.data.pagination.totalPages}
                </span>
                <ChatIconButton
                  disabled={!contactsQuery.data.pagination.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                  aria-label={t.next}
                  title={t.next}
                >
                  <ChevronRight className="size-4" />
                </ChatIconButton>
              </div>
            )}
          </aside>

          <section
            className={cn(
              "relative min-h-0 min-w-0 flex-col",
              threadOpen ? "flex" : "max-xl:hidden xl:flex",
            )}
          >
            {!selected ? (
              <div className="grid flex-1 place-items-center text-sm text-[var(--muted)]">
                {t.noSelection}
              </div>
            ) : (
              <>
                <ChatThreadHeader
                  backLabel={t.back}
                  onBack={() => {
                    setSuggestions([]);
                    setMobileThreadOpen(false);
                  }}
                  avatar={
                    <UserAvatar
                      user={{
                        firstName: selected.firstName,
                        lastName: selected.lastName,
                        profileImage: null,
                      }}
                    />
                  }
                  title={`${selected.firstName} ${selected.lastName}`.trim()}
                  subtitle={selected.email}
                  meta={
                    <FormStatusBadge status={selected.status}>
                      {selected.status === "open" ? t.open : t.answered}
                    </FormStatusBadge>
                  }
                />
                <div className="chat-message-stream relative isolate min-h-0 flex-1 overflow-hidden">
                  <div
                    ref={messagesRef}
                    className="absolute inset-0 overflow-y-auto px-4 pb-4"
                  >
                    <DateGroupedMessageList
                      items={selected.messages}
                      formatDate={formatMessageDate}
                      renderItem={(message) => (
                        <div>
                          <ChatMessageBubble
                            direction={
                              message.sender === "staff" ? "outgoing" : "incoming"
                            }
                            content={message.content}
                            createdAt={message.createdAt}
                            name={firstNameOnly(message.senderName)}
                            nameHref={
                              message.sender === "staff" && message.senderId
                                ? `/admin/users/${message.senderId}`
                                : undefined
                            }
                          />
                          {message.sender === "staff" && message.emailMessageId && (
                            <p className="mt-1 flex justify-end gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                              <MailCheck className="size-3" /> {t.delivery}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>
                  <ChatSuggestionPanel
                    suggestions={suggestions}
                    onSelect={(suggestion) => {
                      setReply(suggestion);
                      setSuggestions([]);
                    }}
                  />
                </div>
                <footer className="chat-composer-footer shrink-0 p-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <ChatComposer
                    value={reply}
                    onValueChange={setReply}
                    onSubmit={sendReply}
                    placeholder={t.reply}
                    sendLabel={t.send}
                    sending={replyMutation.isPending}
                    submitOnEnter={false}
                    tools={
                      <>
                        <ChatToolButton
                          icon={Lightbulb}
                          loading={suggestionsMutation.isPending}
                          pressed={suggestions.length > 0}
                          onClick={() => {
                            if (suggestions.length > 0) {
                              setSuggestions([]);
                              return;
                            }
                            if (selected) suggestionsMutation.mutate(selected.id);
                          }}
                        >
                          {t.suggestions}
                        </ChatToolButton>
                        <ChatToolButton
                          icon={WandSparkles}
                          disabled={!reply.trim()}
                          loading={rewriteMutation.isPending}
                          onClick={() => {
                            const message = reply.trim();
                            if (selected && message) {
                              rewriteMutation.mutate({ id: selected.id, message });
                            }
                          }}
                          aria-label={t.improve}
                          title={t.improve}
                        />
                      </>
                    }
                  />
                </footer>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export function AdminContactViewFallback() {
  const { locale } = usePreferences();
  const t = copy[locale];
  return (
    <div className="md:flex md:h-[calc(100dvh-3rem)] md:min-h-0 md:flex-col md:overflow-hidden lg:h-[calc(100dvh-4rem)]">
      <PageHeading title={t.title} description={t.description} />
      <ChatWorkspaceSkeleton />
    </div>
  );
}
