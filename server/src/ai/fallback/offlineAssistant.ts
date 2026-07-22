/**
 * Offline Assistant.
 *
 * Used when every configured LLM provider is unavailable, and also for the
 * fixed guardrail responses (unsupported language, out-of-scope). It never
 * calls an LLM — every reply is a predefined, locale-aware string.
 *
 * Capabilities:
 *  - basic role-aware website guidance
 *  - basic account guidance
 *  - explain that AI is temporarily unavailable
 *  - offer support options
 */

import type { AgentInput, AssistantContext, AssistantLocale } from "../types.ts";
import { resolveRoleTier } from "../policies/index.ts";

const line = (locale: AssistantLocale, en: string, de: string): string =>
  locale === "de" ? de : en;

/** Polite refusal for unsupported languages in the current website/chat locale. */
export const offlineUnsupportedLanguageReply = (locale: AssistantLocale): string =>
  line(
    locale,
    "I'm sorry, I can only help in English or German. Please rephrase your message in one of these languages.",
    "Es tut mir leid, ich kann nur auf Englisch oder Deutsch helfen. Bitte formuliere deine Nachricht in einer dieser Sprachen.",
  );

/** Polite refusal for out-of-scope questions. */
export const offlineOutOfScopeReply = (locale: AssistantLocale): string =>
  line(
    locale,
    "I can only help with Karino Task Manager features, account access, account security, or support requests.",
    "Ich kann nur bei Funktionen des Karino Task Managers, Kontozugriff, Kontosicherheit oder Supportanfragen helfen.",
  );

const unavailableNotice = (locale: AssistantLocale): string =>
  line(
    locale,
    "Our AI assistant is temporarily unavailable. I can still provide limited website, account, or support help.",
    "Unser KI-Assistent ist vorübergehend nicht verfügbar. Ich kann weiterhin eingeschränkt bei Website-, Konto- oder Supportfragen helfen.",
  );

const supportOption = (locale: AssistantLocale): string =>
  line(
    locale,
    "If this cannot be resolved here, the assistant will send the conversation to human support automatically.",
    "Wenn sich das Problem hier nicht lösen lässt, leitet der Assistent die Unterhaltung automatisch an den menschlichen Support weiter.",
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
      "Describe the account-access problem here without sharing your password, recovery codes, or other secrets.",
      "Beschreibe das Problem mit dem Kontozugriff hier, ohne Passwort, Wiederherstellungscodes oder andere Geheimnisse mitzuteilen.",
    ),
    supportOption(locale),
  ].join(" ");
};

const websiteGuidance = (context: AssistantContext): string => {
  const locale = context.locale;
  const tier = resolveRoleTier(context);

  if (tier === "guest") {
    return line(
      locale,
      "From Home you can register, sign in, open Contact, change the theme or language, and use Forgot password from the login page.",
      "Auf der Startseite kannst du dich registrieren oder anmelden, Kontakt öffnen, Design oder Sprache wechseln und auf der Anmeldeseite Passwort vergessen verwenden.",
    );
  }

  const personal = line(
    locale,
    "Use Dashboard for progress and upcoming work, My tasks to manage your tasks, and Account for profile, password, and active sessions.",
    "Nutze die Übersicht für Fortschritt und anstehende Aufgaben, Meine Aufgaben zur Aufgabenverwaltung und Konto für Profil, Passwort und aktive Sitzungen.",
  );

  if (tier === "user") return personal;

  const staff = line(
    locale,
    "Staff can also use Users, Support inbox, and Contact form inbox according to their permissions. User tasks are available from the related user profile.",
    "Mitarbeitende können entsprechend ihren Berechtigungen außerdem Benutzer, Support und den Kontaktformular-Posteingang nutzen. Benutzeraufgaben sind im jeweiligen Benutzerprofil verfügbar.",
  );
  return `${personal} ${staff}`;
};

/**
 * Detects a coarse intent from the message so the offline assistant can pick
 * a relevant predefined reply. This is a keyword heuristic, not an LLM.
 */
const detectOfflineIntent = (message: string): "account" | "support" | "website" => {
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
        ? line(
            locale,
            "Describe the support issue here without sharing passwords or security codes.",
            "Beschreibe das Supportproblem hier, ohne Passwörter oder Sicherheitscodes mitzuteilen.",
          )
        : supportOption(locale),
    );
  } else {
    parts.push(websiteGuidance(context));
  }

  return parts.join("\n\n");
};
