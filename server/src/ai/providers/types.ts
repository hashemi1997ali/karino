/**
 * Request and response shapes for the OpenAI-compatible provider.
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
