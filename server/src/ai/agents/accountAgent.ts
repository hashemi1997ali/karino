/**
 * Account Agent.
 *
 * Handles account-related conversations.
 *
 *  - Guests: may only describe an account/login/ban problem. The agent asks
 *    for the email so the backend can verify the account; it never exposes
 *    profile information. Ban handling and support-request creation happen in
 *    the orchestrator/controller, not here.
 *  - Authenticated users: guided through the allowed account operations
 *    (name, email, password, sessions). Sensitive operations require
 *    confirmation and the backend enforces uniqueness / current-password
 *    checks — the agent only guides.
 */

import type { AgentInput, AgentOutput } from "../types.ts";
import type { Agent } from "./base.ts";
import { commonPromptRules, completeOrFallback, tierOf } from "./base.ts";
import { getAllowedAccountOperations } from "../policies/index.ts";

const buildGuestPrompt = (input: AgentInput): string =>
  [
    commonPromptRules(input.context.locale),
    "The user is a GUEST (not signed in).",
    "Guests cannot modify any account. Only help with account-access problems (cannot log in, account may be banned, general account trouble).",
    "Never reveal whether a specific account exists or any profile information.",
    "If the user believes their account is banned or has an access problem, ask for their email address so it can be checked, and explain that you may create a support request on their behalf.",
    "For anything you cannot verify, direct them to the Contact page.",
    "Provide only general login guidance (e.g. password reset, correct email).",
  ].join("\n");

const buildUserPrompt = (input: AgentInput): string => {
  const operations = getAllowedAccountOperations(tierOf(input.context));
  return [
    commonPromptRules(input.context.locale),
    "The user is SIGNED IN.",
    `You can guide the user through these account operations: ${operations.join(", ")}.`,
    "Email changes must be unique; password changes require the current password. Remind the user of these requirements.",
    "All sensitive operations require explicit confirmation before proceeding.",
    "You only guide the user to the correct page/action; the application performs and confirms the change. Never claim a change was made yourself.",
  ].join("\n");
};

export const accountAgent: Agent = {
  id: "account",
  run: (input: AgentInput): Promise<AgentOutput> => {
    const prompt = input.context.authenticated
      ? buildUserPrompt(input)
      : buildGuestPrompt(input);
    return completeOrFallback(prompt, input);
  },
};
