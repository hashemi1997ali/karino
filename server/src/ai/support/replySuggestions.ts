/**
 * Staff reply-suggestion helper.
 *
 * Generates three short reply suggestions for a human support agent based on
 * the current transcript. Uses the provider chain directly; if no provider is
 * available it returns predefined suggestions so the UI still works offline.
 */

import type { AssistantContext, AssistantHistoryMessage } from "../types.ts";
import { runProviders } from "../providers/index.ts";

const fallbackSuggestions = (context: AssistantContext): string[] =>
  context.locale === "de"
    ? [
        "Danke für die Details. Ich prüfe das jetzt für dich.",
        "Kannst du den letzten Schritt vor dem Problem genauer beschreiben?",
        "Ich habe den Fall verstanden und erkläre dir gleich die nächsten Schritte.",
      ]
    : [
        "Thanks for the details. I am checking this for you now.",
        "Could you describe the last step before the problem appeared?",
        "I understand the case and will explain the next steps now.",
      ];

export const generateReplySuggestions = async (
  transcript: AssistantHistoryMessage[],
  context: AssistantContext,
): Promise<string[]> => {
  const language = context.locale === "de" ? "German" : "English";
  const systemPrompt = [
    `You help a Karino Task Manager support agent. Reply in ${language}.`,
    "Create exactly three short, professional support-agent reply suggestions for the latest user message.",
    "Put each suggestion on its own line without numbering or bullet characters.",
  ].join("\n");

  const result = await runProviders({
    systemPrompt,
    history: transcript,
    message:
      "Create exactly three short support-agent reply suggestions for the latest user message.",
  });

  if (result) {
    const suggestions = result.text
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
    if (suggestions.length === 3) return suggestions;
  }

  return fallbackSuggestions(context);
};
