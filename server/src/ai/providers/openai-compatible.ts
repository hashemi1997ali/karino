/**
 * The single LLM provider: any service that speaks the OpenAI-compatible
 * `/chat/completions` API. Switching vendors only means changing three env
 * values, for example:
 *
 *   Groq        AI_BASE_URL=https://api.groq.com/openai/v1
 *   OpenRouter  AI_BASE_URL=https://openrouter.ai/api/v1
 *   OpenAI      AI_BASE_URL=https://api.openai.com/v1
 *   Gemini      AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
 *   Ollama      AI_BASE_URL=http://127.0.0.1:11434/v1   (no AI_API_KEY needed)
 */

import type { ProviderCompletion, ProviderRequest, ProviderToolCall } from "./types.ts";
import { fetchWithTimeout, normalizeSecret } from "./http.ts";

// Reasoning models (gpt-oss, o-series, DeepSeek-R1, …) spend part of
// max_tokens on hidden reasoning; small per-call limits cut answers mid-sentence.
const MIN_MAX_TOKENS = 2048;

export interface AiConfig {
  baseUrl: string;
  apiKey: string | null;
  model: string;
}

/** Returns null (assistant disabled) until both a base URL and a model are set. */
export const getAiConfig = (): AiConfig | null => {
  const baseUrl = process.env.AI_BASE_URL?.trim().replace(/\/+$/, "");
  const model = process.env.AI_MODEL?.trim();
  if (!baseUrl || !model) return null;
  return { baseUrl, model, apiKey: normalizeSecret(process.env.AI_API_KEY) };
};

interface ChatCompletionResponse {
  choices?: Array<{
    finish_reason?: string;
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

export const completeChat = async (
  config: AiConfig,
  request: ProviderRequest,
): Promise<ProviderCompletion> => {
  const response = await fetchWithTimeout(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        ...request.history.slice(-16),
        { role: "user", content: request.message },
      ],
      // ponytail: reasoning-only models (OpenAI o-series / gpt-5) reject a custom
      // temperature; make it configurable if one of those is ever used.
      temperature: request.temperature,
      max_tokens: Math.max(request.maxTokens, MIN_MAX_TOKENS),
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

  if (!response.ok) {
    // The body names the actual problem (bad key, unknown model, …); it never
    // contains the key itself.
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`AI provider returned ${response.status}: ${detail}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const choice = payload.choices?.[0];
  if (choice?.finish_reason === "length") {
    console.warn(`AI reply from ${config.model} hit the token limit and was cut off`);
  }
  const message = choice?.message;
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
