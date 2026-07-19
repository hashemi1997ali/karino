/**
 * Website Help Agent.
 *
 * Explains how to use the website. The set of topics it may cover adapts to
 * the user's role tier via the policy layer. It only explains — it never
 * modifies data and hands account changes to the Account Agent.
 */

import type { AgentInput, AgentOutput } from "../types.ts";
import type { Agent } from "./base.ts";
import { commonPromptRules, completeOrFallback, tierOf } from "./base.ts";
import {
  getAllowedHelpTopics,
  getForbiddenHelpTopics,
} from "../policies/index.ts";

const buildPrompt = (input: AgentInput): string => {
  const { context } = input;
  const tier = tierOf(context);
  const allowed = getAllowedHelpTopics(tier);
  const forbidden = getForbiddenHelpTopics();

  return [
    commonPromptRules(context.locale),
    `Role of the current user: ${tier}.`,
    `You may explain: ${allowed.join(", ")}.`,
    `You must NOT explain: ${forbidden.join(", ")}.`,
    "You only explain how things work; you never change any data.",
    "If the user wants to change account information (name, email, password, sessions), tell them you can hand this to the account assistant.",
  ].join("\n");
};

export const websiteHelpAgent: Agent = {
  id: "website-help",
  run: (input: AgentInput): Promise<AgentOutput> =>
    completeOrFallback(buildPrompt(input), input),
};
