/** Google Gemini `generateContent` provider. */

import type { ChatProvider, ProviderCompletion, ProviderRequest } from "./types.ts";
import { fetchWithTimeout, normalizeSecret } from "./http.ts";

const callGemini = async (
  apiKey: string,
  model: string,
  request: ProviderRequest,
): Promise<ProviderCompletion> => {
  const contents = [
    ...request.history.slice(-16),
    { role: "user" as const, content: request.message },
  ].map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }],
  }));

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.systemPrompt }] },
        contents,
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
        },
        ...(request.tools?.length
          ? {
              tools: [
                {
                  functionDeclarations: request.tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.inputSchema,
                  })),
                },
              ],
            }
          : {}),
      }),
    },
  );

  if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          functionCall?: { name?: string; args?: unknown };
        }>;
      };
    }>;
  };
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();
  const toolCalls = parts
    .filter((part) => Boolean(part.functionCall?.name))
    .map((part, index) => ({
      id: `tool-${index}`,
      name: part.functionCall?.name ?? "",
      arguments: part.functionCall?.args ?? {},
    }));
  if (!text && toolCalls.length === 0) {
    throw new Error("Gemini returned an empty response");
  }
  return { text, toolCalls };
};

export const geminiProvider: ChatProvider = {
  name: "gemini",
  isConfigured: () => normalizeSecret(process.env.GEMINI_API_KEY) !== null,
  complete: (request) => {
    const key = normalizeSecret(process.env.GEMINI_API_KEY);
    if (!key) throw new Error("GEMINI_API_KEY is missing");
    return callGemini(key, process.env.GEMINI_MODEL ?? "gemini-2.5-flash", request);
  },
};
