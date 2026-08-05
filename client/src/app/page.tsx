"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Headphones,
  Inbox,
  LockKeyhole,
  MessageSquareText,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Timer,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { Logo } from "@/components/logo";
import { PublicHeader } from "@/components/marketing/public-header";
import { buttonClassName } from "@/components/ui/button";
import { usePreferences } from "@/providers/preferences-provider";

const copy = {
  en: {
    heroEyebrow: "AI-assisted customer support",
    heroTitle: "Every request gets",
    heroAccent: "a clear next move.",
    heroDescription:
      "Karino Desk keeps customer conversations, AI triage, and human support in one calm workspace—so context never disappears during a handoff.",
    start: "Start your desk",
    explore: "Explore the preview",
    benefits: ["AI-first triage", "Human handoff with context", "Responsive by default"],
    preview: {
      label: "Interactive product preview",
      workspace: "Karino Desk",
      sample: "Sample workspace",
      navigation: "Preview navigation",
      inbox: "Inbox",
      resolved: "Resolved",
      customers: "Customers",
      queue: "Support queue",
      queueDescription: "Two open requests and one recent resolution",
      resolvedDescription: "Recently closed requests with their final context",
      customersDescription: "Select a customer request to inspect its full history",
      localTime: "Local time",
      open: "2 open",
      nextSla: "Sample SLA · 10:36",
      resolvedCount: "1 resolved",
      customersCount: "3 customers",
      conversation: "Conversation",
      context: "Context",
      received: "Received",
      lastReply: "Last reply",
      responseDue: "Response due",
      transfer: "Hand off to support",
      transferred: "Support requested",
      transferNote:
        "This preview mirrors the real handoff: ticket context and timestamps move into a linked live-support chat.",
      aiAgent: "Karino Request Assistant",
      aiRole: "Draft and triage",
      humanAgent: "Nora Keller",
      humanRole: "Support specialist",
      customer: "Customer",
      ai: "AI",
      previewHint: "Select a conversation, then try the handoff.",
      tickets: [
        {
          id: "KRN-1042",
          initials: "MK",
          customerName: "Mia Keller",
          subject: "I cannot update my billing email",
          status: "Open",
          priority: "High",
          tone: "urgent",
          replyBy: "ai",
          received: "09:42",
          lastReply: "09:57",
          due: "13:42",
          sla: "3h 45m left",
          message: "I changed companies and no longer have access to my old inbox.",
          aiReply:
            "This change needs account verification. I have structured the request so support can review it with the right context.",
          customerReply: "Please connect me with someone who can verify the account.",
        },
        {
          id: "KRN-1041",
          initials: "JS",
          customerName: "Jonas Schmidt",
          subject: "An unknown device is still signed in",
          status: "In progress",
          priority: "Urgent",
          tone: "active",
          replyBy: "ai",
          received: "09:36",
          lastReply: "09:51",
          due: "10:36",
          sla: "45 min left",
          message: "I closed the session, but an unfamiliar device still appears active.",
          aiReply:
            "I have captured the device and session details. This security request is ready for a support specialist.",
          customerReply: "Please keep the device details attached to the request.",
        },
        {
          id: "KRN-1039",
          initials: "AN",
          customerName: "Amelie Neumann",
          subject: "How do I close an old session?",
          status: "Resolved",
          priority: "Low",
          tone: "resolved",
          replyBy: "staff",
          received: "09:18",
          lastReply: "09:20",
          due: "—",
          sla: "Resolved 09:20",
          message:
            "My old laptop is still listed under active sessions. How can I remove it?",
          aiReply:
            "Open Account, choose Active sessions, then close the session for the old laptop.",
          customerReply: "The old session is closed—thank you!",
        },
      ],
    },
    featuresEyebrow: "One operational view",
    featuresTitle: "Support feels lighter when context stays connected.",
    featuresDescription:
      "Karino Desk is designed around the work a support team actually does: understand, route, respond, and follow through.",
    features: [
      {
        title: "A queue with context",
        description:
          "See who is waiting, what they need, the conversation history, and the next response deadline together.",
      },
      {
        title: "AI that knows when to stop",
        description:
          "AI helps structure the request and makes live support available when human judgment is needed.",
      },
      {
        title: "Clear ownership",
        description:
          "Claim, transfer, and close support conversations without losing the customer’s place in the story.",
      },
    ],
    timeEyebrow: "Time is part of the work",
    timeTitle: "Every important moment stays visible.",
    timeDescription:
      "Received time, latest reply, handoff, and resolution belong beside the conversation—not buried in a log.",
    timeEvents: [
      {
        time: "09:36",
        label: "Request submitted",
        detail: "Ticket and SLA targets were created",
      },
      {
        time: "09:38",
        label: "AI context attached",
        detail: "Customer confirmed the structured draft",
      },
      {
        time: "09:42",
        label: "Agent claimed",
        detail: "Ownership changed; response timer continues",
      },
      {
        time: "10:36",
        label: "First response due",
        detail: "Stops only after a human reply",
      },
    ],
    workflowEyebrow: "From first message to resolution",
    workflowTitle: "AI starts. Your team stays in control.",
    workflowDescription:
      "AI helps collect and structure the first context. People take over when the conversation needs judgment, empathy, or account access.",
    steps: [
      {
        number: "01",
        title: "Understand",
        description:
          "AI structures the request and answers only verified Karino guidance.",
      },
      {
        number: "02",
        title: "Hand off",
        description: "The full conversation moves to the support queue in one action.",
      },
      {
        number: "03",
        title: "Resolve",
        description: "An operator claims the case, responds, and closes the loop.",
      },
    ],
    securityTitle: "Secure access without support friction.",
    securityDescription:
      "Role-aware administration and session controls help protect customer conversations while keeping everyday work fast.",
    securityItems: ["Role-aware access", "Session management", "Remote sign-out"],
    ctaEyebrow: "A calmer support desk",
    ctaTitle: "Keep the speed. Keep the human context.",
    ctaDescription:
      "Start with one workspace for customer requests, AI assistance, and live support.",
    footer: "Customer support, with a clear next move.",
    contact: "Contact",
  },
  de: {
    heroEyebrow: "KI-gestützter Kundenservice",
    heroTitle: "Jede Anfrage bekommt",
    heroAccent: "einen klaren nächsten Schritt.",
    heroDescription:
      "Karino Desk verbindet Kundengespräche, KI-Triage und menschlichen Support in einem ruhigen Arbeitsbereich – damit beim Übergang kein Kontext verloren geht.",
    start: "Desk starten",
    explore: "Vorschau entdecken",
    benefits: [
      "Triage zuerst mit KI",
      "Übergabe mit vollständigem Kontext",
      "Für jeden Bildschirm",
    ],
    preview: {
      label: "Interaktive Produktvorschau",
      workspace: "Karino Desk",
      sample: "Beispiel-Arbeitsbereich",
      navigation: "Vorschau-Navigation",
      inbox: "Posteingang",
      resolved: "Gelöst",
      customers: "Kunden",
      queue: "Support-Warteschlange",
      queueDescription: "Zwei offene Anfragen und eine kürzlich gelöste",
      resolvedDescription: "Kürzlich gelöste Anfragen mit ihrem letzten Kontext",
      customersDescription:
        "Wähle eine Kundenanfrage, um ihren vollständigen Verlauf zu sehen",
      localTime: "Ortszeit",
      open: "2 offen",
      nextSla: "Beispiel-SLA · 10:36",
      resolvedCount: "1 gelöst",
      customersCount: "3 Kunden",
      conversation: "Gespräch",
      context: "Kontext",
      received: "Eingang",
      lastReply: "Letzte Antwort",
      responseDue: "Antwort fällig",
      transfer: "An Support übergeben",
      transferred: "Support angefragt",
      transferNote:
        "Diese Vorschau bildet die echte Übergabe ab: Ticketkontext und Zeitstempel wechseln in einen verknüpften Live-Support-Chat.",
      aiAgent: "Karino Anfrageassistent",
      aiRole: "Entwurf und Triage",
      humanAgent: "Nora Keller",
      humanRole: "Support-Spezialistin",
      customer: "Kunde",
      ai: "KI",
      previewHint: "Wähle ein Gespräch und teste dann die Übergabe.",
      tickets: [
        {
          id: "KRN-1042",
          initials: "MK",
          customerName: "Mia Keller",
          subject: "Ich kann meine Rechnungs-E-Mail nicht ändern",
          status: "Offen",
          priority: "Hoch",
          tone: "urgent",
          replyBy: "ai",
          received: "09:42",
          lastReply: "09:57",
          due: "13:42",
          sla: "Noch 3 Std. 45 Min.",
          message:
            "Ich habe die Firma gewechselt und keinen Zugriff mehr auf mein altes Postfach.",
          aiReply:
            "Diese Änderung erfordert eine Kontoprüfung. Ich habe die Anfrage strukturiert, damit der Support sie mit dem richtigen Kontext prüfen kann.",
          customerReply:
            "Bitte verbinden Sie mich mit jemandem, der das Konto prüfen kann.",
        },
        {
          id: "KRN-1041",
          initials: "JS",
          customerName: "Jonas Schmidt",
          subject: "Ein unbekanntes Gerät ist noch angemeldet",
          status: "In Bearbeitung",
          priority: "Dringend",
          tone: "active",
          replyBy: "ai",
          received: "09:36",
          lastReply: "09:51",
          due: "10:36",
          sla: "Noch 45 Min.",
          message:
            "Ich habe die Sitzung beendet, aber ein unbekanntes Gerät wird weiterhin als aktiv angezeigt.",
          aiReply:
            "Geräte- und Sitzungsdetails sind erfasst. Diese Sicherheitsanfrage ist für einen Support-Spezialisten vorbereitet.",
          customerReply: "Bitte die Gerätedetails an der Anfrage lassen.",
        },
        {
          id: "KRN-1039",
          initials: "AN",
          customerName: "Amelie Neumann",
          subject: "Wie beende ich eine alte Sitzung?",
          status: "Gelöst",
          priority: "Niedrig",
          tone: "resolved",
          replyBy: "staff",
          received: "09:18",
          lastReply: "09:20",
          due: "—",
          sla: "Gelöst um 09:20",
          message:
            "Mein alter Laptop wird noch unter den aktiven Sitzungen angezeigt. Wie entferne ich ihn?",
          aiReply:
            "Öffne Konto, wähle Aktive Sitzungen und beende dann die Sitzung des alten Laptops.",
          customerReply: "Die alte Sitzung ist beendet – danke!",
        },
      ],
    },
    featuresEyebrow: "Eine operative Ansicht",
    featuresTitle: "Support wird leichter, wenn der Kontext verbunden bleibt.",
    featuresDescription:
      "Karino Desk ist um die echte Arbeit eines Supportteams gebaut: verstehen, zuordnen, antworten und zuverlässig abschließen.",
    features: [
      {
        title: "Warteschlange mit Kontext",
        description:
          "Sieh gemeinsam, wer wartet, worum es geht, was bisher geschrieben wurde und wann die nächste Antwort fällig ist.",
      },
      {
        title: "KI, die rechtzeitig stoppt",
        description:
          "Die KI strukturiert die Anfrage und macht Live-Support verfügbar, sobald menschliches Urteil nötig ist.",
      },
      {
        title: "Klare Verantwortung",
        description:
          "Übernimm, übertrage und schließe Gespräche, ohne den roten Faden für den Kunden zu verlieren.",
      },
    ],
    timeEyebrow: "Zeit gehört zur Arbeit",
    timeTitle: "Jeder wichtige Moment bleibt sichtbar.",
    timeDescription:
      "Eingang, letzte Antwort, Übergabe und Lösung gehören direkt zum Gespräch – nicht versteckt in einem Protokoll.",
    timeEvents: [
      {
        time: "09:36",
        label: "Anfrage eingereicht",
        detail: "Ticket und SLA-Ziele wurden erstellt",
      },
      {
        time: "09:38",
        label: "KI-Kontext angehängt",
        detail: "Kunde hat den strukturierten Entwurf bestätigt",
      },
      {
        time: "09:42",
        label: "Agent hat übernommen",
        detail: "Zuständigkeit geändert; Antworttimer läuft weiter",
      },
      {
        time: "10:36",
        label: "Erste Antwort fällig",
        detail: "Stoppt erst nach einer menschlichen Antwort",
      },
    ],
    workflowEyebrow: "Von der ersten Nachricht bis zur Lösung",
    workflowTitle: "KI beginnt. Dein Team behält die Kontrolle.",
    workflowDescription:
      "Die KI sammelt und strukturiert den ersten Kontext. Menschen steigen ein, wenn Urteil, Empathie oder Kontozugriff gefragt sind.",
    steps: [
      {
        number: "01",
        title: "Verstehen",
        description:
          "Die KI strukturiert die Anfrage und beantwortet nur verifizierte Karino-Hinweise.",
      },
      {
        number: "02",
        title: "Übergeben",
        description:
          "Das vollständige Gespräch wandert mit einer Aktion in die Support-Warteschlange.",
      },
      {
        number: "03",
        title: "Lösen",
        description: "Ein Operator übernimmt den Fall, antwortet und schließt ihn ab.",
      },
    ],
    securityTitle: "Sicherer Zugriff ohne Reibung im Support.",
    securityDescription:
      "Rollenbasierte Verwaltung und Sitzungskontrollen schützen Kundengespräche, ohne den Alltag auszubremsen.",
    securityItems: ["Rollenbasierter Zugriff", "Sitzungsverwaltung", "Remote-Abmeldung"],
    ctaEyebrow: "Ein ruhigerer Support-Desk",
    ctaTitle: "Behalte das Tempo. Behalte den menschlichen Kontext.",
    ctaDescription:
      "Starte mit einem Arbeitsbereich für Kundenanfragen, KI-Unterstützung und Live-Support.",
    footer: "Kundenservice mit einem klaren nächsten Schritt.",
    contact: "Kontakt",
  },
} as const;

const featureIcons = [Inbox, Bot, UserRoundCheck] as const;

const subscribeToClock = (onStoreChange: () => void): (() => void) => {
  const timer = window.setInterval(onStoreChange, 1_000);
  return () => window.clearInterval(timer);
};

const getClockSnapshot = (): number => Math.floor(Date.now() / 1_000);
const getServerClockSnapshot = (): number => 0;

function LocalClock({ locale, fallback }: { locale: string; fallback: string }) {
  const second = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerClockSnapshot,
  );
  const date = second ? new Date(second * 1_000) : null;
  const label = date
    ? new Intl.DateTimeFormat(locale, {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date)
    : fallback;

  return (
    <time dateTime={date?.toISOString()}>
      <Clock3 className="size-3.5" aria-hidden="true" />
      {label}
    </time>
  );
}

export default function HomePage() {
  const { locale, intlLocale } = usePreferences();
  const t = copy[locale];
  const currentYear = new Date().getFullYear();
  const [previewView, setPreviewView] = useState<"inbox" | "resolved" | "customers">(
    "inbox",
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string>("KRN-1042");
  const [transferredTicketIds, setTransferredTicketIds] = useState<string[]>([]);
  const previewTickets =
    previewView === "resolved"
      ? t.preview.tickets.filter((item) => item.tone === "resolved")
      : previewView === "inbox"
        ? t.preview.tickets.filter((item) => item.tone !== "resolved")
        : t.preview.tickets;
  const ticket =
    previewTickets.find((item) => item.id === selectedTicketId) ??
    previewTickets[0] ??
    t.preview.tickets[0];
  const isTransferred = transferredTicketIds.includes(ticket.id);
  const canTransfer = ticket.tone !== "resolved";

  const transferTicket = () => {
    if (!canTransfer || isTransferred) return;
    setTransferredTicketIds((current) => [...current, ticket.id]);
  };
  const selectPreviewView = (view: "inbox" | "resolved" | "customers") => {
    const candidates =
      view === "resolved"
        ? t.preview.tickets.filter((item) => item.tone === "resolved")
        : view === "inbox"
          ? t.preview.tickets.filter((item) => item.tone !== "resolved")
          : t.preview.tickets;
    setPreviewView(view);
    if (candidates[0]) setSelectedTicketId(candidates[0].id);
  };

  return (
    <div className="nova-site min-h-dvh overflow-hidden">
      <PublicHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="nova-hero">
          <div className="nova-hero-aura nova-hero-aura-one" aria-hidden="true" />
          <div className="nova-hero-aura nova-hero-aura-two" aria-hidden="true" />
          <div className="nova-hero-inner">
            <div className="nova-hero-copy">
              <span className="nova-pill">
                <Sparkles className="size-3.5" aria-hidden="true" />
                {t.heroEyebrow}
              </span>
              <h1>
                {t.heroTitle} <span>{t.heroAccent}</span>
              </h1>
              <p>{t.heroDescription}</p>
              <div className="nova-hero-actions">
                <Link
                  href="/register"
                  className={buttonClassName({
                    size: "lg",
                    className: "nova-primary-action",
                  })}
                >
                  {t.start}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href="#product-preview"
                  className={buttonClassName({
                    variant: "secondary",
                    size: "lg",
                    className: "nova-secondary-action",
                  })}
                >
                  {t.explore}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
              <ul className="nova-benefits" aria-label={t.heroEyebrow}>
                {t.benefits.map((item) => (
                  <li key={item}>
                    <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div id="product-preview" className="nova-product-stage">
              <div className="nova-preview-caption">
                <span>
                  <i aria-hidden="true" />
                  {t.preview.label}
                </span>
                <small>{t.preview.previewHint}</small>
              </div>

              <div className="nova-product">
                <header className="nova-product-topbar">
                  <div className="nova-product-brand">
                    <span>
                      <MessageSquareText className="size-4" aria-hidden="true" />
                    </span>
                    <strong>{t.preview.workspace}</strong>
                    <small>{t.preview.sample}</small>
                  </div>
                  <nav className="nova-product-tabs" aria-label={t.preview.navigation}>
                    <button
                      type="button"
                      className={previewView === "inbox" ? "is-active" : undefined}
                      aria-pressed={previewView === "inbox"}
                      onClick={() => selectPreviewView("inbox")}
                    >
                      <Inbox className="size-3.5" aria-hidden="true" />
                      {t.preview.inbox}
                    </button>
                    <button
                      type="button"
                      className={previewView === "resolved" ? "is-active" : undefined}
                      aria-pressed={previewView === "resolved"}
                      onClick={() => selectPreviewView("resolved")}
                    >
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      {t.preview.resolved}
                    </button>
                    <button
                      type="button"
                      className={previewView === "customers" ? "is-active" : undefined}
                      aria-pressed={previewView === "customers"}
                      onClick={() => selectPreviewView("customers")}
                    >
                      <UserRoundCheck className="size-3.5" aria-hidden="true" />
                      {t.preview.customers}
                    </button>
                  </nav>
                  <LocalClock locale={intlLocale} fallback={t.preview.localTime} />
                </header>

                <div className="nova-product-body">
                  <aside className="nova-product-queue">
                    <div className="nova-queue-heading">
                      <div>
                        <span className="desk-live-dot" aria-hidden="true" />
                        <div>
                          <h2>
                            {previewView === "resolved"
                              ? t.preview.resolved
                              : previewView === "customers"
                                ? t.preview.customers
                                : t.preview.queue}
                          </h2>
                          <p>
                            {previewView === "resolved"
                              ? t.preview.resolvedDescription
                              : previewView === "customers"
                                ? t.preview.customersDescription
                                : t.preview.queueDescription}
                          </p>
                        </div>
                      </div>
                      <strong>
                        {previewView === "resolved"
                          ? t.preview.resolvedCount
                          : previewView === "customers"
                            ? t.preview.customersCount
                            : t.preview.open}
                      </strong>
                    </div>

                    <div className="nova-ticket-list">
                      {previewTickets.map((item) => {
                        const transferred = transferredTicketIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={
                              "nova-ticket is-" +
                              item.tone +
                              (selectedTicketId === item.id ? " is-selected" : "")
                            }
                            aria-pressed={selectedTicketId === item.id}
                            onClick={() => setSelectedTicketId(item.id)}
                          >
                            <span className="nova-ticket-avatar">{item.initials}</span>
                            <span className="nova-ticket-copy">
                              <span>
                                <strong>{item.customerName}</strong>
                                <small>{item.received}</small>
                              </span>
                              <b>{item.subject}</b>
                              <span>
                                <em>{transferred ? t.preview.transferred : item.status}</em>
                                <small>
                                  <Clock3 className="size-3" aria-hidden="true" />
                                  {item.sla}
                                </small>
                              </span>
                            </span>
                            <ChevronRight className="size-3.5" aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
                  </aside>

                  <article
                    key={ticket.id}
                    className="nova-product-thread"
                    aria-live="polite"
                  >
                    <div className="nova-thread-heading">
                      <div>
                        <span>{t.preview.conversation}</span>
                        <h2>{ticket.subject}</h2>
                        <small>
                          {ticket.id} · {ticket.customerName}
                        </small>
                      </div>
                      <span className={"nova-priority is-" + ticket.tone}>
                        {ticket.priority}
                      </span>
                    </div>

                    <div className="nova-thread-messages">
                      <div className="nova-message is-customer">
                        <span>
                          {t.preview.customer} · {ticket.received}
                        </span>
                        <p>{ticket.message}</p>
                      </div>
                      <div className="nova-message is-ai">
                        <span>
                          <Sparkles className="size-3" aria-hidden="true" />
                          {ticket.replyBy === "staff"
                            ? t.preview.humanAgent
                            : t.preview.ai}{" "}
                          · {ticket.lastReply}
                        </span>
                        <p>{ticket.aiReply}</p>
                      </div>
                      <div className="nova-message is-customer is-compact">
                        <span>{t.preview.customer}</span>
                        <p>{ticket.customerReply}</p>
                      </div>
                    </div>

                    <div className={"nova-handoff" + (isTransferred ? " is-complete" : "")}>
                      <span>
                        {isTransferred ? (
                          <Headphones className="size-4" aria-hidden="true" />
                        ) : (
                          <Bot className="size-4" aria-hidden="true" />
                        )}
                      </span>
                      <div>
                        <strong>
                          {isTransferred ? t.preview.humanAgent : t.preview.aiAgent}
                        </strong>
                        <small>
                          {isTransferred ? t.preview.humanRole : t.preview.aiRole}
                        </small>
                      </div>
                      <button
                        type="button"
                        onClick={transferTicket}
                        disabled={!canTransfer || isTransferred}
                      >
                        {isTransferred ? (
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        ) : (
                          <Headphones className="size-3.5" aria-hidden="true" />
                        )}
                        {isTransferred ? t.preview.transferred : t.preview.transfer}
                      </button>
                    </div>
                    {isTransferred && (
                      <p className="nova-transfer-note">{t.preview.transferNote}</p>
                    )}
                  </article>

                  <aside className="nova-product-context">
                    <div className="nova-context-heading">
                      <span>{t.preview.context}</span>
                      <ShieldCheck className="size-4" aria-hidden="true" />
                    </div>
                    <dl>
                      <div>
                        <dt>{t.preview.received}</dt>
                        <dd>{ticket.received}</dd>
                      </div>
                      <div>
                        <dt>{t.preview.lastReply}</dt>
                        <dd>{ticket.lastReply}</dd>
                      </div>
                      <div className={ticket.tone === "urgent" ? "is-urgent" : ""}>
                        <dt>{t.preview.responseDue}</dt>
                        <dd>{ticket.due}</dd>
                      </div>
                    </dl>
                    {previewView === "inbox" && (
                      <div className="nova-sla-card">
                        <span>
                          <Timer className="size-4" aria-hidden="true" />
                        </span>
                        <div>
                          <small>{t.preview.nextSla}</small>
                          <strong>{ticket.sla}</strong>
                        </div>
                      </div>
                    )}
                    <div className="nova-context-agent">
                      <span>{isTransferred ? "NK" : "AI"}</span>
                      <div>
                        <strong>
                          {isTransferred ? t.preview.humanAgent : t.preview.aiAgent}
                        </strong>
                        <small>
                          {isTransferred ? t.preview.humanRole : t.preview.aiRole}
                        </small>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="nova-section">
          <div className="nova-section-heading">
            <div>
              <p className="desk-eyebrow">{t.featuresEyebrow}</p>
              <h2>{t.featuresTitle}</h2>
            </div>
            <p>{t.featuresDescription}</p>
          </div>
          <div className="nova-feature-grid">
            {t.features.map(({ title, description }, index) => {
              const Icon = featureIcons[index];
              return (
                <article key={title} className={"nova-feature-card is-" + (index + 1)}>
                  <span className="nova-feature-number">0{index + 1}</span>
                  <span className="nova-feature-icon">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <div className="nova-feature-line" aria-hidden="true" />
                </article>
              );
            })}
          </div>
        </section>

        <section className="nova-time-band">
          <div className="nova-time-copy">
            <p className="desk-eyebrow">{t.timeEyebrow}</p>
            <h2>{t.timeTitle}</h2>
            <p>{t.timeDescription}</p>
            <div className="nova-time-pulse">
              <Clock3 className="size-4" aria-hidden="true" />
              <span>10:36</span>
              <small>{t.preview.nextSla}</small>
            </div>
          </div>
          <ol className="nova-timeline">
            {t.timeEvents.map((event, index) => (
              <li key={event.time + event.label}>
                <time>{event.time}</time>
                <span className={index === t.timeEvents.length - 1 ? "is-due" : ""} />
                <div>
                  <strong>{event.label}</strong>
                  <p>{event.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="workflow" className="nova-section nova-workflow">
          <div className="nova-workflow-intro">
            <span className="nova-orbit" aria-hidden="true">
              <Sparkles className="size-5" />
            </span>
            <p className="desk-eyebrow">{t.workflowEyebrow}</p>
            <h2>{t.workflowTitle}</h2>
            <p>{t.workflowDescription}</p>
          </div>
          <ol className="nova-workflow-list">
            {t.steps.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
                <ArrowRight className="size-4" aria-hidden="true" />
              </li>
            ))}
          </ol>
        </section>

        <section id="security" className="nova-security">
          <div className="nova-security-copy">
            <span>
              <LockKeyhole className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2>{t.securityTitle}</h2>
              <p>{t.securityDescription}</p>
            </div>
          </div>
          <div className="nova-security-list">
            {t.securityItems.map((item) => (
              <div key={item}>
                <ShieldCheck className="size-4" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="nova-cta">
          <div className="nova-cta-aura" aria-hidden="true" />
          <div>
            <p className="desk-eyebrow">{t.ctaEyebrow}</p>
            <h2>{t.ctaTitle}</h2>
            <p>{t.ctaDescription}</p>
          </div>
          <Link
            href="/register"
            className={buttonClassName({
              size: "lg",
              className: "nova-cta-action",
            })}
          >
            {t.start}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer className="nova-footer">
        <div>
          <Logo />
          <p>{t.footer}</p>
          <div>
            <Link href="/contact">{t.contact}</Link>
            <span>
              <Paperclip className="size-3.5" aria-hidden="true" /> Karino {currentYear}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
