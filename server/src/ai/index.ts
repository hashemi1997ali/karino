/**
 * Public entry point of the modular AI module.
 *
 * The backward-compatible `assistantService` facade imports from here so the
 * rest of the server (chat controller) keeps its existing API.
 */

export type {
  AssistantContext,
  AssistantHistoryMessage,
  AssistantLocale,
  AssistantResult,
  ReplyAgentId,
  TriageDecision,
} from "./types.ts";

export { runOrchestrator } from "./orchestrator/index.ts";
export { generateReplySuggestions } from "./support/replySuggestions.ts";
