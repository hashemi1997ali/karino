/**
 * OpenAI-compatible Chat Completions provider.
 *
 * Used directly by OpenAI and, with a different endpoint + headers, by
 * OpenRouter. Both speak the same `/chat/completions` schema.
 */

import type {
  ChatProvider,
  ProviderCompletion,
  ProviderRequest,
  ProviderToolCall,
} from "./types.ts";
import { fetchWithTimeout, normalizeSecret } from "./http.ts";

interface OpenAiLikeResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
}

const parseToolArguments = (value: string | undefined): unknown => {
  if (!value) return {};
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const callOpenAiCompatible = async (
  endpoint: string,
  apiKey: string,
  model: string,
  request: ProviderRequest,
  extraHeaders: Record<string, string> = {},
): Promise<ProviderCompletion> => {
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
      ...(request.tools?.length
        ? {
            tools: request.tools.map((tool) => ({
              type: "function",
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
              },
            })),
            tool_choice: "auto",
          }
        : {}),
    }),
  });

  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);

  const payload = (await response.json()) as OpenAiLikeResponse;
  const message = payload.choices?.[0]?.message;
  const text = message?.content?.trim() ?? "";
  const toolCalls: ProviderToolCall[] = (message?.tool_calls ?? [])
    .filter((item) => item.type === "function" && Boolean(item.function?.name))
    .map((item, index) => ({
      id: item.id ?? `tool-${index}`,
      name: item.function?.name ?? "",
      arguments: parseToolArguments(item.function?.arguments),
    }));
  if (!text && toolCalls.length === 0) {
    throw new Error("AI provider returned an empty response");
  }
  return { text, toolCalls };
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
        "X-OpenRouter-Title": process.env.AI_APP_NAME ?? "Karino",
      },
    );
  },
};
