/**
 * Offline Assistant.
 *
 * Used when every configured LLM provider is unavailable, and also for the
 * fixed guardrail responses (unsupported language, out-of-scope). It never
 * calls an LLM — every reply is a predefined, locale-aware string.
 *
 * Capabilities:
 *  - basic website explanation
 *  - basic account guidance
 *  - explain that AI is temporarily unavailable
 *  - offer contact / support options
 */

import type {
  AgentInput,
  AssistantContext,
  AssistantLocale,
} from "../types.ts";
import { resolveRoleTier } from "../policies/index.ts";

const line = (locale: AssistantLocale, en: string, de: string): string =>
  locale === "de" ? de : en;

/** Polite refusal for unsupported languages (always bilingual). */
export const offlineUnsupportedLanguageReply = (): string =>
  [
    "I'm sorry, I can only help in English or German. Please rephrase your message in one of these languages.",
    "Es tut mir leid, ich kann nur auf Englisch oder Deutsch helfen. Bitte formuliere deine Nachricht in einer dieser Sprachen.",
  ].join("\n\n");

/** Polite refusal for out-of-scope questions. */
export const offlineOutOfScopeReply = (locale: AssistantLocale): string =>
  line(
    locale,
    "I can only help with the Karino Task Manager — for example account, login, tasks, dashboard, profile, sessions, or support. Could you ask something about the website?",
    "Ich kann nur beim Karino Task Manager helfen – zum Beispiel bei Konto, Anmeldung, Aufgaben, Dashboard, Profil, Sitzungen oder Support. Kannst du etwas zur Website fragen?",
  );

const websiteExplanation = (locale: AssistantLocale): string =>
  line(
    locale,
    "Karino Task Manager lets you create, organise, and complete tasks with status, priority, and attachments. From the Account area you can manage your profile, password, and active sessions.",
    "Mit dem Karino Task Manager kannst du Aufgaben mit Status, Priorität und Anhängen erstellen, organisieren und abschließen. Im Kontobereich verwaltest du Profil, Passwort und aktive Sitzungen.",
  );

const unavailableNotice = (locale: AssistantLocale): string =>
  line(
    locale,
    "Our AI assistant is temporarily unavailable, so I'm giving you some general guidance instead.",
    "Unser KI-Assistent ist vorübergehend nicht verfügbar, daher gebe ich dir stattdessen allgemeine Hinweise.",
  );

const contactOption = (locale: AssistantLocale): string =>
  line(
    locale,
    "If you need more help, please visit the Contact page.",
    "Wenn du weitere Hilfe brauchst, besuche bitte die Kontaktseite.",
  );

const supportOption = (locale: AssistantLocale): string =>
  line(
    locale,
    "You can also send this conversation to our human support team from the support button.",
    "Du kannst diese Unterhaltung auch über die Support-Schaltfläche an unser Support-Team weiterleiten.",
  );

const accountGuidance = (context: AssistantContext): string => {
  const locale = context.locale;
  if (context.authenticated) {
    return [
      line(
        locale,
        "You can review and update your account details, password, and active sessions from the Account area.",
        "Deine Kontodaten, dein Passwort und deine aktiven Sitzungen kannst du im Kontobereich einsehen und ändern.",
      ),
      supportOption(locale),
    ].join(" ");
  }
  return [
    line(
      locale,
      "For account issues, please make sure you are using the correct email address and try resetting your password.",
      "Bei Kontoproblemen stelle bitte sicher, dass du die richtige E-Mail-Adresse verwendest, und versuche, dein Passwort zurückzusetzen.",
    ),
    contactOption(locale),
  ].join(" ");
};

/**
 * Detects a coarse intent from the message so the offline assistant can pick
 * a relevant predefined reply. This is a keyword heuristic, not an LLM.
 */
const detectOfflineIntent = (
  message: string,
): "account" | "support" | "website" => {
  const lower = message.toLowerCase();
  if (
    /\b(account|konto|login|log in|anmeld|password|passwort|email|e-mail|ban|gesperrt|session|sitzung)\b/.test(
      lower,
    )
  ) {
    return "account";
  }
  if (/\b(support|human|mensch|agent|ticket|help desk|problem)\b/.test(lower)) {
    return "support";
  }
  return "website";
};

/**
 * Produces the offline reply for a normal (non-guardrail) message.
 * Always prefixes the "AI temporarily unavailable" notice so the user knows
 * they are talking to the fallback.
 */
export const runOfflineAssistant = (input: AgentInput): string => {
  const { message, context } = input;
  const locale = context.locale;
  const intent = detectOfflineIntent(message);
  const tier = resolveRoleTier(context);

  const parts: string[] = [unavailableNotice(locale)];

  if (intent === "account") {
    parts.push(accountGuidance(context));
  } else if (intent === "support") {
    parts.push(
      tier === "guest"
        ? [
            line(
              locale,
              "For personal support you need to sign in first.",
              "Für persönlichen Support musst du dich zuerst anmelden.",
            ),
            contactOption(locale),
          ].join(" ")
        : supportOption(locale),
    );
  } else {
    parts.push(websiteExplanation(locale));
    parts.push(tier === "guest" ? contactOption(locale) : supportOption(locale));
  }

  return parts.join("\n\n");
};
