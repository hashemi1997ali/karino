/** Anthropic Messages API provider. */

import type { ChatProvider, ProviderRequest } from "./types.ts";
import { fetchWithTimeout, normalizeSecret } from "./http.ts";

const callAnthropic = async (
  apiKey: string,
  model: string,
  request: ProviderRequest,
): Promise<string> => {
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
    }),
  });

  if (!response.ok) throw new Error(`Anthropic returned ${response.status}`);
  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = payload.content
    ?.filter((item) => item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();
  if (!text) throw new Error("Anthropic returned an empty response");
  return text;
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
