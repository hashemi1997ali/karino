/**
 * OpenAI-compatible Chat Completions provider.
 *
 * Used directly by OpenAI and, with a different endpoint + headers, by
 * OpenRouter. Both speak the same `/chat/completions` schema.
 */

import type { ChatProvider, ProviderRequest } from "./types.ts";
import { fetchWithTimeout, normalizeSecret } from "./http.ts";

interface OpenAiLikeResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

const callOpenAiCompatible = async (
  endpoint: string,
  apiKey: string,
  model: string,
  request: ProviderRequest,
  extraHeaders: Record<string, string> = {},
): Promise<string> => {
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: request.systemPrompt },
        ...request.history.slice(-16),
        { role: "user", content: request.message },
      ],
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    }),
  });

  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);

  const payload = (await response.json()) as OpenAiLikeResponse;
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI provider returned an empty response");
  return text;
};

/** Native OpenAI provider. */
export const openAiProvider: ChatProvider = {
  name: "openai",
  isConfigured: () => normalizeSecret(process.env.OPENAI_API_KEY) !== null,
  complete: (request) => {
    const key = normalizeSecret(process.env.OPENAI_API_KEY);
    if (!key) throw new Error("OPENAI_API_KEY is missing");
    return callOpenAiCompatible(
      "https://api.openai.com/v1/chat/completions",
      key,
      process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      request,
    );
  },
};

/** OpenRouter provider (OpenAI-compatible with extra attribution headers). */
export const openRouterProvider: ChatProvider = {
  name: "openrouter",
  isConfigured: () => normalizeSecret(process.env.OPENROUTER_API_KEY) !== null,
  complete: (request) => {
    const key = normalizeSecret(process.env.OPENROUTER_API_KEY);
    if (!key) throw new Error("OPENROUTER_API_KEY is missing");
    return callOpenAiCompatible(
      "https://openrouter.ai/api/v1/chat/completions",
      key,
      process.env.OPENROUTER_MODEL ?? "openai/gpt-oss-20b:free",
      request,
      {
        ...(process.env.APP_URL && { "HTTP-Referer": process.env.APP_URL }),
        "X-OpenRouter-Title": process.env.AI_APP_NAME ?? "Karino Task Manager",
      },
    );
  },
};
