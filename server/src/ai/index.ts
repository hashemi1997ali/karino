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
  AssistantAction,
  EscalationReason,
  ReplyAgentId,
  TaskAssistantResult,
  TaskContextItem,
  TaskProposalDraft,
  TriageDecision,
} from "./types.ts";

export { runOrchestrator } from "./orchestrator/index.ts";
export { runTaskAgent } from "./agents/taskAgent.ts";
export {
  generateReplySuggestions,
  generateEmailReplySuggestions,
  rewriteEmailDraft,
  rewriteStaffDraft,
  type StaffWritingContext,
  type SupportTranscriptMessage,
} from "./support/replySuggestions.ts";

export { detectMessageLocale } from "./language.ts";
