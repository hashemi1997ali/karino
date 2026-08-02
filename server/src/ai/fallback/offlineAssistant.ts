import type { AgentInput, AssistantLocale } from "../types.ts";
import { resolveRoleTier } from "../policies/index.ts";

const line = (locale: AssistantLocale, en: string, de: string): string =>
  locale === "de" ? de : en;

export const offlineUnsupportedLanguageReply = (locale: AssistantLocale): string =>
  line(
    locale,
    "I'm sorry, I can only help in English or German. Please rephrase your message in one of these languages.",
    "Es tut mir leid, ich kann nur auf Englisch oder Deutsch helfen. Bitte formuliere deine Nachricht in einer dieser Sprachen.",
  );

export const offlineOutOfScopeReply = (locale: AssistantLocale): string =>
  line(
    locale,
    "I can only help with Karino and its task-management features.",
    "Ich kann nur bei Karino und seinen Funktionen zur Aufgabenverwaltung helfen.",
  );

const unavailable = (locale: AssistantLocale): string =>
  line(
    locale,
    "The AI assistant is temporarily unavailable, so I can provide only limited guidance.",
    "Der AI Assistant ist vorübergehend nicht verfügbar, daher kann ich nur eingeschränkt weiterhelfen.",
  );

const detectsAccountIssue = (message: string): boolean =>
  /\b(account|konto|login|log in|anmeld|password|passwort|email|e-mail|ban|banned|gesperrt|session|sitzung|human|support|agent|mensch)\b/i.test(
    message,
  );

export const runOfflineAssistant = (input: AgentInput): string => {
  const { context, message } = input;
  const tier = resolveRoleTier(context);
  const notice = unavailable(context.locale);

  if (tier === "guest") {
    const guidance = detectsAccountIssue(message)
      ? line(
          context.locale,
          "For an account, ban, access, or personal-assistance request, use the public Contact form. The private task assistant is available only to signed-in users.",
          "Nutze für Konto-, Sperr-, Zugriffs- oder persönliche Hilfeanfragen das öffentliche Kontaktformular. Der private Aufgabenassistent ist nur für angemeldete Benutzer verfügbar.",
        )
      : line(
          context.locale,
          "Karino helps people organise tasks, priorities, due dates, daily focus, and progress. The public Contact form is available for personal requests.",
          "Karino hilft dabei, Aufgaben, Prioritäten, Fälligkeiten, den Tagesfokus und Fortschritt zu organisieren. Für persönliche Anfragen gibt es das öffentliche Kontaktformular.",
        );
    return `${notice}\n\n${guidance}`;
  }

  if (tier === "user" && detectsAccountIssue(message)) {
    return `${notice}\n\n${line(
      context.locale,
      "[ESCALATE:account_access]I could not resolve this account request automatically. Live support can help you next.",
      "[ESCALATE:account_access]Ich konnte diese Kontoanfrage nicht automatisch lösen. Der Live-Support kann dir als Nächstes helfen.",
    )}`;
  }

  if (tier === "admin" || tier === "super_admin") {
    return `${notice}\n\n${line(
      context.locale,
      "Use /user for a read-only lookup. Use /ban or /unban to prepare an allowed change; a separate /confirm-* command is required. Only super admins may use /promote or /demote.",
      "Nutze /user für eine schreibgeschützte Abfrage. Mit /ban oder /unban bereitest du eine zulässige Änderung vor; dafür ist anschließend ein separater /confirm-*-Befehl erforderlich. Nur Super-Admins dürfen /promote oder /demote verwenden.",
    )}`;
  }

  return `${notice}\n\n${line(
    context.locale,
    "Use Dashboard to review progress, My tasks to manage work, and the private AI Assistant for task planning and confirmed task creation.",
    "Nutze die Übersicht für deinen Fortschritt, Meine Aufgaben zur Verwaltung und den privaten AI Assistant für Planung und bestätigte Aufgabenerstellung.",
  )}`;
};
