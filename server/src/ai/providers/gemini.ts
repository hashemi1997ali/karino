/** Google Gemini `generateContent` provider. */

import type { ChatProvider, ProviderRequest } from "./types.ts";
import { fetchWithTimeout, normalizeSecret } from "./http.ts";

const callGemini = async (
  apiKey: string,
  model: string,
  request: ProviderRequest,
): Promise<string> => {
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
      }),
    },
  );

  if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
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
