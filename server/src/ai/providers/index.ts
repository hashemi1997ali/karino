/**
 * Provider registry.
 *
 * The active provider is chosen by the `AI_PROVIDER` env var (preserving the
 * original behaviour). `runProviders` tries the selected provider and returns
 * the first successful reply; if it fails or is unconfigured the caller falls
 * back to the Offline Assistant.
 */

import type { AssistantHistoryMessage } from "../types.ts";
import type { ChatProvider, ProviderRequest } from "./types.ts";
import { anthropicProvider } from "./anthropic.ts";
import { geminiProvider } from "./gemini.ts";
import { ollamaProvider } from "./ollama.ts";
import { openAiProvider, openRouterProvider } from "./openai.ts";

export type { ChatProvider, ProviderRequest } from "./types.ts";

const REGISTRY: Record<string, ChatProvider> = {
  openai: openAiProvider,
  openrouter: openRouterProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  ollama: ollamaProvider,
};

/** Reads and normalises the configured provider name. */
export const getConfiguredProviderName = (): string =>
  (process.env.AI_PROVIDER ?? "none").trim().toLowerCase();

/**
 * Returns the ordered list of providers to attempt. Currently this is the
 * single provider selected by `AI_PROVIDER`, but the array shape allows a
 * future multi-provider fallback chain without changing the orchestrator.
 */
export const getActiveProviders = (): ChatProvider[] => {
  const provider = REGISTRY[getConfiguredProviderName()];
  return provider ? [provider] : [];
};

export interface ProviderRunResult {
  text: string;
  provider: string;
}

/**
 * Attempts each active provider in order and returns the first success.
 * Returns `null` when no provider is configured or every attempt fails, so
 * the orchestrator can switch to the Offline Assistant.
 */
export const runProviders = async (params: {
  systemPrompt: string;
  history: AssistantHistoryMessage[];
  message: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<ProviderRunResult | null> => {
  const request: ProviderRequest = {
    systemPrompt: params.systemPrompt,
    history: params.history,
    message: params.message,
    temperature: params.temperature ?? 0.2,
    maxTokens: params.maxTokens ?? 700,
  };

  for (const provider of getActiveProviders()) {
    if (!provider.isConfigured()) continue;
    try {
      const text = await provider.complete(request);
      return { text, provider: provider.name };
    } catch (error) {
      console.error(`AI provider ${provider.name} failed:`, error);
    }
  }

  return null;
};
