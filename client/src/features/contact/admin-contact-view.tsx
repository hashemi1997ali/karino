"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Lightbulb,
  Mail,
  MailCheck,
  Send,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { Textarea } from "@/components/ui/form-controls";
import { PageHeading } from "@/components/ui/page-heading";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { ChatMessageBubble } from "@/features/chat/chat-message-bubble";
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
    suggestions: "Suggested email replies",
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
    suggestions: "E-Mail-Antwortvorschläge",
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
  const [reply, setReply] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
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
    new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }).format(
      new Date(value),
    );
  const formatLastMessage = (contact: ContactSubmission) =>
    new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(contact.messages.at(-1)?.createdAt ?? contact.updatedAt));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [effectiveSelectedId, selected?.messages.length]);

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

  return (
    <div className="lg:flex lg:h-[calc(100dvh-9.75rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />

      {contactsQuery.isPending ? (
        <div className="mt-8">
          <LoadingState label={t.loading} />
        </div>
      ) : contactsQuery.isError ? (
        <div className="mt-8">
          <ErrorState
            message={getErrorMessage(contactsQuery.error, locale)}
            retry={() => void contactsQuery.refetch()}
          />
        </div>
      ) : contacts.length === 0 ? (
        <Card className="mt-8 grid min-h-52 place-items-center p-8 text-center text-sm text-[var(--muted)]">
          <Mail className="mb-3 size-8 text-[var(--primary)]" />
          {t.empty}
        </Card>
      ) : (
        <div className="mt-7 grid items-start gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
          <Card className="flex h-[min(70dvh,46rem)] min-h-[32rem] flex-col overflow-hidden p-2 lg:h-full lg:min-h-0">
            <p className="shrink-0 px-3 py-2 text-xs font-black uppercase tracking-[.08em] text-[var(--muted)]">
              {t.history}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={cn(
                    "group relative h-[6.75rem] w-full border-b p-3 text-left transition-colors duration-200 last:border-b-0",
                    effectiveSelectedId === contact.id
                      ? "bg-[var(--primary-soft)] shadow-[inset_3px_0_0_var(--primary)]"
                      : "hover:bg-[color-mix(in_srgb,var(--surface-muted)_78%,var(--primary-soft))]",
                  )}
                >
                  <button
                    type="button"
                    className="focus-ring absolute inset-0 z-0 transition active:bg-[var(--primary-soft)]/60"
                    onClick={() => {
                      setSelectedId(contact.id);
                      setSuggestions([]);
                      setReply("");
                    }}
                    aria-label={`Open form: ${contact.firstName} ${contact.lastName}`}
                    aria-current={effectiveSelectedId === contact.id ? "true" : undefined}
                  />
                  <div className="pointer-events-none relative z-10">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <Badge
                      className={
                        contact.status === "open" ? "text-amber-700" : "text-emerald-700"
                      }
                    >
                      {contact.status === "open" ? t.open : t.answered}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--muted)]">
                    {contact.email}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <time className="truncate text-[10px] text-[var(--muted)]">
                      {formatLastMessage(contact)}
                    </time>
                  </div>
                  </div>
                </div>
              ))}
            </div>
            {contactsQuery.data && contactsQuery.data.pagination.totalPages > 1 && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-t p-2 text-xs">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!contactsQuery.data.pagination.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {t.previous}
                </Button>
                <span className="text-[var(--muted)]">
                  {t.page} {contactsQuery.data.pagination.page} /{" "}
                  {contactsQuery.data.pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!contactsQuery.data.pagination.hasNextPage}
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
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[var(--surface-muted)] p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      user={{
                        firstName: selected.firstName,
                        lastName: selected.lastName,
                        profileImage: null,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-black">
                        {selected.firstName} {selected.lastName}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {selected.email}
                      </p>
                    </div>
                  </div>
                  <Badge>{selected.status === "open" ? t.open : t.answered}</Badge>
                </div>
                <div className="relative min-h-0 flex-1">
                  <div className="absolute inset-0 overflow-y-auto px-4 pb-4">
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
                            <p className="mt-1 flex justify-end gap-1 text-[10px] text-emerald-600">
                              <MailCheck className="size-3" /> {t.delivery}
                            </p>
                          )}
                        </div>
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
                              setReply(suggestion);
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
                <div className="shrink-0 border-t p-3">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={suggestionsMutation.isPending}
                      onClick={() => {
                        if (suggestions.length > 0) {
                          setSuggestions([]);
                          return;
                        }
                        if (selected) suggestionsMutation.mutate(selected.id);
                      }}
                    >
                      <Lightbulb className="size-4" />
                      {t.suggestions}
                    </Button>
                  </div>
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder={t.reply}
                      className="min-h-12 max-h-32 flex-1 resize-y"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-12 shrink-0 rounded-full"
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
                    >
                      <WandSparkles className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="size-12 shrink-0 rounded-full"
                      disabled={!reply.trim()}
                      loading={replyMutation.isPending}
                      onClick={sendReply}
                      aria-label={t.send}
                      title={t.send}
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
  );
}
