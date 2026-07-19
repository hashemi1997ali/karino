/** Local Ollama provider (`/api/chat`). No API key required. */

import type { ChatProvider, ProviderRequest } from "./types.ts";
import { fetchWithTimeout } from "./http.ts";

const callOllama = async (model: string, request: ProviderRequest): Promise<string> => {
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
      options: { temperature: request.temperature },
    }),
  });

  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const payload = (await response.json()) as { message?: { content?: string } };
  const text = payload.message?.content?.trim();
  if (!text) throw new Error("Ollama returned an empty response");
  return text;
};

export const ollamaProvider: ChatProvider = {
  name: "ollama",
  // Ollama runs locally without a key; treat it as always "configured".
  isConfigured: () => true,
  complete: (request) => callOllama(process.env.OLLAMA_MODEL ?? "qwen3:4b", request),
};
