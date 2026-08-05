/** Anthropic Messages API provider. */

import type { ChatProvider, ProviderCompletion, ProviderRequest } from "./types.ts";
import { fetchWithTimeout, normalizeSecret } from "./http.ts";

const callAnthropic = async (
  apiKey: string,
  model: string,
  request: ProviderRequest,
): Promise<ProviderCompletion> => {
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      system: request.systemPrompt,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      messages: [
        ...request.history.slice(-16),
        { role: "user", content: request.message },
      ],
      ...(request.tools?.length
        ? {
            tools: request.tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              input_schema: tool.inputSchema,
            })),
          }
        : {}),
    }),
  });

  if (!response.ok) throw new Error(`Anthropic returned ${response.status}`);
  const payload = (await response.json()) as {
    content?: Array<{
      type?: string;
      text?: string;
      id?: string;
      name?: string;
      input?: unknown;
    }>;
  };
  const text = (payload.content ?? [])
    .filter((item) => item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();
  const toolCalls = (payload.content ?? [])
    .filter((item) => item.type === "tool_use" && Boolean(item.name))
    .map((item, index) => ({
      id: item.id ?? `tool-${index}`,
      name: item.name ?? "",
      arguments: item.input ?? {},
    }));
  if (!text && toolCalls.length === 0) {
    throw new Error("Anthropic returned an empty response");
  }
  return { text, toolCalls };
};

export const anthropicProvider: ChatProvider = {
  name: "anthropic",
  isConfigured: () => normalizeSecret(process.env.ANTHROPIC_API_KEY) !== null,
  complete: (request) => {
    const key = normalizeSecret(process.env.ANTHROPIC_API_KEY);
    if (!key) throw new Error("ANTHROPIC_API_KEY is missing");
    return callAnthropic(
      key,
      process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
      request,
    );
  },
};
