/**
 * Website Help Agent.
 *
 * Explains the website using a role-scoped, code-maintained feature list. It
 * never reads live page state, modifies data, or exposes features belonging
 * to a higher role.
 */

import type { AgentInput, AgentOutput } from "../types.ts";
import type { Agent } from "./base.ts";
import { commonPromptRules, completeOrFallback, tierOf } from "./base.ts";
import { getAllowedHelpTopics, getForbiddenHelpTopics } from "../policies/index.ts";

const buildPrompt = (input: AgentInput): string => {
  const tier = tierOf(input.context);
  const allowed = getAllowedHelpTopics(tier);
  const forbidden = getForbiddenHelpTopics();
  const sections =
    tier === "guest"
      ? ["Home", "Contact", "Forgot password"]
      : tier === "user"
        ? ["Dashboard", "My tasks", "Account"]
        : [
            "Dashboard",
            "My tasks",
            "Account",
            "Users",
            "Support inbox",
            "Contact form inbox",
          ];

  return [
    commonPromptRules(input.context.locale),
    "You are the Website Help Agent. Explain only how the listed Karino features work.",
    `Current user's role tier: ${tier}.`,
    "Verified features visible to this role:",
    ...allowed.map((topic) => `- ${topic}`),
    "Forbidden guidance:",
    ...forbidden.map((topic) => `- ${topic}`),
    "Never claim to see the user's current screen, selected values, tasks, account data, or live UI state.",
    `Give short navigation guidance using only these sections visible to this role: ${sections.join(", ")}.`,
    "If the requested feature is not in the verified list, say that you cannot verify it instead of guessing.",
    "You explain only. Never claim to click a control, submit a form, change data, or complete an action.",
    "For account changes or access problems, direct the conversation to the account assistant. For privileged staff actions, explain that backend permissions and confirmation still apply.",
  ].join("\n");
};

export const websiteHelpAgent: Agent = {
  id: "website-help",
  run: (input: AgentInput): Promise<AgentOutput> =>
    completeOrFallback(buildPrompt(input), input),
};
