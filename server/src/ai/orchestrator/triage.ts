/**
 * Triage Router.
 *
 * This component NEVER replies to the user. It only inspects the message and
 * context and produces an internal {@link TriageDecision} that selects which
 * reply-agent should run next (or flags a guardrail rejection).
 *
 * It must never answer questions, call tools, modify the database, create
 * support chats, or explain anything to the user.
 */

import type {
  AssistantContext,
  ReplyAgentId,
  TriageDecision,
} from "../types.ts";
import { languageGuardrail, scopeGuardrail } from "../guardrails/index.ts";
import { isStaffTier, resolveRoleTier } from "../policies/index.ts";

/** Keywords that indicate a staff/administrative operation. */
const STAFF_PATTERN =
  /\b(ban|unban|sperr|entsperr|promote|demote|beförder|herabstuf|admin|role|rolle|user lookup|benutzerstatus)\b/i;

/** Keywords that indicate an account operation or account problem. */
const ACCOUNT_PATTERN =
  /\b(login|log in|anmeld|register|registrier|password|passwort|email|e-mail|session|sitzung|device|gerät|profile|profil|account|konto|banned|gesperrt|revoke|widerruf)\b/i;

/**
 * Decides the target agent. Guardrails are evaluated first: a wrong-language
 * or out-of-scope message routes to the Offline Assistant, which returns the
 * appropriate predefined refusal (the triage router itself stays silent).
 */
export const triage = (
  message: string,
  context: AssistantContext,
): TriageDecision => {
  // 1. Language guardrail — unsupported languages are refused offline.
  if (!languageGuardrail(message).passed) {
    return {
      agent: "offline",
      reason: "unsupported-language",
      outOfScope: false,
      wrongLanguage: true,
    };
  }

  // 2. Scope guardrail — unrelated topics are refused offline.
  if (!scopeGuardrail(message).passed) {
    return {
      agent: "offline",
      reason: "out-of-scope",
      outOfScope: true,
      wrongLanguage: false,
    };
  }

  const tier = resolveRoleTier(context);
  const agent = pickAgent(message, tier);

  return {
    agent,
    reason: `intent-routed:${agent}`,
    outOfScope: false,
    wrongLanguage: false,
  };
};

/** Intent + role based agent selection. */
const pickAgent = (
  message: string,
  tier: ReturnType<typeof resolveRoleTier>,
): ReplyAgentId => {
  // Staff operations are only offered to admins / super admins.
  if (isStaffTier(tier) && STAFF_PATTERN.test(message)) {
    return "staff";
  }

  // Account operations / problems go to the Account Agent for every tier
  // (guests get account-problem handling, users get account management).
  if (ACCOUNT_PATTERN.test(message)) {
    return "account";
  }

  // Everything else is a general "how does the website work" question.
  return "website-help";
};
