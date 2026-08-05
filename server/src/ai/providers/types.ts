/**
 * Provider abstraction layer.
 *
 * Every LLM backend implements the {@link ChatProvider} interface so the
 * orchestrator can iterate over a prioritised list and fall back to the next
 * provider when one fails.
 */

import type { AssistantHistoryMessage } from "../types.ts";

export interface ProviderToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ProviderToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface ProviderCompletion {
  text: string;
  toolCalls: ProviderToolCall[];
}

/** Parameters passed to a single provider completion call. */
export interface ProviderRequest {
  systemPrompt: string;
  history: AssistantHistoryMessage[];
  message: string;
  temperature: number;
  maxTokens: number;
  tools?: ProviderToolDefinition[];
}

/**
 * A chat provider wraps one LLM backend (OpenAI, Anthropic, …).
 *
 *  - `name`        stable identifier reported back to the caller as `provider`.
 *  - `isConfigured` returns `false` when the required API key / endpoint is
 *                   missing so the orchestrator can skip it without a network
 *                   round-trip.
 *  - `complete`    performs the actual request and returns the reply text or
 *                  throws on any failure (network, auth, empty response).
 */
export interface ChatProvider {
  readonly name: string;
  isConfigured(): boolean;
  complete(request: ProviderRequest): Promise<ProviderCompletion>;
}
