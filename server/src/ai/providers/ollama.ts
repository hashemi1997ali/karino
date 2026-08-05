/** Local Ollama provider (`/api/chat`). No API key required. */

import type { ChatProvider, ProviderCompletion, ProviderRequest } from "./types.ts";
import { fetchWithTimeout } from "./http.ts";

const callOllama = async (
  model: string,
  request: ProviderRequest,
): Promise<ProviderCompletion> => {
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(
    /\/$/,
    "",
  );
  const response = await fetchWithTimeout(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: request.systemPrompt },
        ...request.history.slice(-16),
        { role: "user", content: request.message },
      ],
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
          }
        : {}),
      options: { temperature: request.temperature },
    }),
  });

  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const payload = (await response.json()) as {
    message?: {
      content?: string;
      tool_calls?: Array<{
        function?: { name?: string; arguments?: unknown };
      }>;
    };
  };
  const text = payload.message?.content?.trim() ?? "";
  const toolCalls = (payload.message?.tool_calls ?? [])
    .filter((item) => Boolean(item.function?.name))
    .map((item, index) => ({
      id: `tool-${index}`,
      name: item.function?.name ?? "",
      arguments: item.function?.arguments ?? {},
    }));
  if (!text && toolCalls.length === 0) {
    throw new Error("Ollama returned an empty response");
  }
  return { text, toolCalls };
};

export const ollamaProvider: ChatProvider = {
  name: "ollama",
  // Ollama runs locally without a key; treat it as always "configured".
  isConfigured: () => true,
  complete: (request) => callOllama(process.env.OLLAMA_MODEL ?? "qwen3:4b", request),
};
