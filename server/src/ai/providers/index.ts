/**
 * Provider entry point. The assistant talks to one OpenAI-compatible endpoint
 * configured by AI_BASE_URL, AI_API_KEY and AI_MODEL (see openai-compatible.ts).
 * When it is unconfigured or fails, callers get an explicit unavailable state.
 */

import type { AssistantHistoryMessage } from "../types.ts";
import type { ProviderToolCall, ProviderToolDefinition } from "./types.ts";
import { completeChat, getAiConfig } from "./openai-compatible.ts";

export type {
  ProviderRequest,
  ProviderToolCall,
  ProviderToolDefinition,
} from "./types.ts";

/** Label reported with each reply, e.g. "api.groq.com", or "none". */
export const getConfiguredProviderName = (): string => {
  const config = getAiConfig();
  if (!config) return "none";
  try {
    return new URL(config.baseUrl).hostname;
  } catch {
    return config.baseUrl;
  }
};

export interface ProviderRunResult {
  text: string;
  provider: string;
  toolCalls: ProviderToolCall[];
}

/** Returns `null` when no provider is configured or the request fails. */
export const runProviders = async (params: {
  systemPrompt: string;
  history: AssistantHistoryMessage[];
  message: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ProviderToolDefinition[];
}): Promise<ProviderRunResult | null> => {
  const config = getAiConfig();
  if (!config) return null;

  try {
    const completion = await completeChat(config, {
      systemPrompt: params.systemPrompt,
      history: params.history,
      message: params.message,
      temperature: params.temperature ?? 0.2,
      maxTokens: params.maxTokens ?? 700,
      tools: params.tools,
    });
    return { ...completion, provider: getConfiguredProviderName() };
  } catch (error) {
    console.error(`AI provider ${getConfiguredProviderName()} failed:`, error);
    return null;
  }
};
