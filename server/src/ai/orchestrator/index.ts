/**
 * Orchestrator.
 *
 * Wires the whole pipeline together:
 *
 *   inbound guardrails (via triage) → agent selection → agent run →
 *   outbound guardrail → result
 *
 * It is the single public entry point of the AI module and is consumed by the
 * backward-compatible `assistantService` facade.
 */

import type {
  AgentInput,
  AssistantContext,
  AssistantHistoryMessage,
  AssistantResult,
  ReplyAgentId,
} from "../types.ts";
import { AGENTS } from "../agents/index.ts";
import { OFFLINE_PROVIDER } from "../agents/base.ts";
import { outputGuardrail } from "../guardrails/index.ts";
import {
  offlineOutOfScopeReply,
  offlineUnsupportedLanguageReply,
  runOfflineAssistant,
} from "../fallback/offlineAssistant.ts";
import { getConfiguredProviderName } from "../providers/index.ts";
import { triage } from "./triage.ts";

/**
 * Runs one assistant turn.
 *
 *  - Applies inbound language/scope guardrails through the triage router.
 *  - Selects and runs the target agent (or the Offline Assistant).
 *  - Applies the outbound guardrail to prevent hallucinated confirmations or
 *    leaked prompts before returning the reply.
 */
export const runOrchestrator = async (
  message: string,
  history: AssistantHistoryMessage[],
  context: AssistantContext,
): Promise<AssistantResult> => {
  const decision = triage(message, context);
  const input: AgentInput = { message, history, context };

  // Guardrail rejections are answered by fixed offline replies.
  if (decision.wrongLanguage) {
    return finalize(offlineUnsupportedLanguageReply(), "offline", OFFLINE_PROVIDER, context);
  }
  if (decision.outOfScope) {
    return finalize(
      offlineOutOfScopeReply(context.locale),
      "offline",
      OFFLINE_PROVIDER,
      context,
    );
  }

  const agent = AGENTS[decision.agent];

  // No LLM agent for this id (shouldn't happen) → offline.
  if (!agent) {
    return finalize(runOfflineAssistant(input), "offline", OFFLINE_PROVIDER, context);
  }

  const output = await agent.run(input);
  const provider = output.usedLlm ? getConfiguredProviderName() : OFFLINE_PROVIDER;
  const agentId: ReplyAgentId = output.usedLlm ? decision.agent : "offline";

  return finalize(output.reply, agentId, provider, context);
};

/** Applies the outbound guardrail and packages the final result. */
const finalize = (
  reply: string,
  agent: ReplyAgentId,
  provider: string,
  context: AssistantContext,
): AssistantResult => {
  const guard = outputGuardrail(reply, context);
  const safeReply = guard.passed ? reply : (guard.replacement ?? reply);
  return { reply: safeReply, agent, provider };
};
