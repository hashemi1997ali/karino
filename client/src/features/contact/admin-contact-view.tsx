"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Mail, MailCheck, Send, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-controls";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { ChatMessageBubble } from "@/features/chat/chat-message-bubble";
import {
  listContactSubmissionsRequest,
  replyToContactRequest,
} from "@/features/contact/api";
import { getErrorMessage } from "@/lib/api-error";
import type { ContactSubmission } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    eyebrow: "Contact form",
    title: "Contact inbox",
    description:
      "Review messages submitted through the public contact form and reply by email.",
    loading: "Loading contact messages…",
    empty: "There are no contact messages yet.",
    open: "Open",
    answered: "Answered",
    noSelection: "Select a contact message from the inbox.",
    reply: "Write an email reply…",
    send: "Send email reply",
    sent: "The reply was emailed and added to this conversation.",
    contactDetails: "Submitted contact details",
    language: "Language",
    created: "Received",
    delivery: "Sent by email",
    previous: "Previous",
    next: "Next",
    page: "Page",
  },
  de: {
    eyebrow: "Kontaktformular",
    title: "Kontakt-Posteingang",
    description:
      "Nachrichten aus dem öffentlichen Kontaktformular lesen und per E-Mail beantworten.",
    loading: "Kontaktnachrichten werden geladen…",
    empty: "Es gibt noch keine Kontaktnachrichten.",
    open: "Offen",
    answered: "Beantwortet",
    noSelection: "Wähle eine Nachricht aus dem Posteingang.",
    reply: "E-Mail-Antwort schreiben…",
    send: "Antwort per E-Mail senden",
    sent: "Die Antwort wurde per E-Mail gesendet und hier gespeichert.",
    contactDetails: "Eingegebene Kontaktdaten",
    language: "Sprache",
    created: "Empfangen",
    delivery: "Per E-Mail gesendet",
    previous: "Zurück",
    next: "Weiter",
    page: "Seite",
  },
} as const;

export function AdminContactView() {
  const { locale } = usePreferences();
  const t = copy[locale];
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
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
      toast.success(t.sent);
    },
    onError: (error) => toast.error(getErrorMessage(error, locale)),
  });
  const sendReply = () => {
    const message = reply.trim();
    if (!selected || !message || replyMutation.isPending) return;
    replyMutation.mutate({ id: selected.id, message });
  };

  return (
    <div>
      <p className="eyebrow text-[var(--primary)]">{t.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black">{t.title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
        {t.description}
      </p>

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
        <div className="mt-7 grid items-start gap-5 xl:grid-cols-[20rem_minmax(0,1fr)_18rem]">
          <Card className="flex h-[min(70dvh,46rem)] min-h-[32rem] flex-col overflow-hidden p-2">
            <div className="min-h-0 flex-1 overflow-y-auto">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => setSelectedId(contact.id)}
                  className={cn(
                    "focus-ring mb-1 w-full rounded-2xl p-3 text-left transition",
                    effectiveSelectedId === contact.id
                      ? "bg-[var(--primary-soft)]"
                      : "hover:bg-[var(--surface-muted)]",
                  )}
                >
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
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                    {contact.messages.at(-1)?.content}
                  </p>
                </button>
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

          <Card className="flex h-[min(70dvh,46rem)] min-h-[32rem] flex-col overflow-hidden">
            {!selected ? (
              <div className="grid flex-1 place-items-center text-sm text-[var(--muted)]">
                {t.noSelection}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 border-b bg-[var(--surface-muted)] p-4">
                  <div className="min-w-0">
                    <p className="truncate font-black">
                      {selected.firstName} {selected.lastName}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {selected.email}
                    </p>
                  </div>
                  <Badge>{selected.status === "open" ? t.open : t.answered}</Badge>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {selected.messages.map((message) => (
                    <div key={message.id}>
                      <ChatMessageBubble
                        direction={message.sender === "staff" ? "outgoing" : "incoming"}
                        content={message.content}
                        createdAt={message.createdAt}
                        name={message.senderName}
                      />
                      {message.sender === "staff" && message.emailMessageId && (
                        <p className="mt-1 flex justify-end gap-1 text-[10px] text-emerald-600">
                          <MailCheck className="size-3" /> {t.delivery}
                        </p>
                      )}
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
                <div className="shrink-0 border-t p-3">
                  <Textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder={t.reply}
                    className="min-h-24"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button loading={replyMutation.isPending} onClick={sendReply}>
                      <Send className="size-4" />
                      {t.send}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>

          <Card className="h-fit p-4">
            <p className="text-sm font-black">{t.contactDetails}</p>
            {selected && (
              <div className="mt-4 space-y-4 text-sm">
                <span className="grid size-12 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                  <UserRound className="size-5" />
                </span>
                <div>
                  <p className="font-black">
                    {selected.firstName} {selected.lastName}
                  </p>
                  <a
                    href={`mailto:${selected.email}`}
                    className="break-all text-xs text-[var(--primary)]"
                  >
                    {selected.email}
                  </a>
                </div>
                <div className="grid gap-2 rounded-2xl bg-[var(--surface-muted)] p-3 text-xs">
                  <p className="flex justify-between gap-3">
                    <span className="text-[var(--muted)]">{t.language}</span>
                    <strong>{selected.locale.toUpperCase()}</strong>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="text-[var(--muted)]">{t.created}</span>
                    <strong>
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                        new Date(selected.createdAt),
                      )}
                    </strong>
                  </p>
                </div>
                {selected.status === "answered" && (
                  <p className="flex items-center gap-2 text-xs text-emerald-600">
                    <CheckCircle2 className="size-4" /> {t.answered}
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
