import { apiRequest } from "@/lib/api-client";
import type { AssistantConversation, Task } from "@/lib/types";

export interface AssistantTurnResult {
  conversation: AssistantConversation;
  provider: string;
}

export const listAssistantConversationsRequest = async (): Promise<
  AssistantConversation[]
> => {
  const data = await apiRequest<{ conversations: AssistantConversation[] }>("/assistant");
  return data.conversations;
};

export const createAssistantConversationRequest = (
  message: string,
  locale: "en" | "de",
): Promise<AssistantTurnResult> =>
  apiRequest<AssistantTurnResult>("/assistant", {
    method: "POST",
    json: { message, locale },
  });

export const sendAssistantMessageRequest = (
  conversationId: string,
  message: string,
  locale: "en" | "de",
): Promise<AssistantTurnResult> =>
  apiRequest<AssistantTurnResult>(`/assistant/${conversationId}/messages`, {
    method: "POST",
    json: { message, locale },
  });

export const confirmAssistantTaskRequest = (
  conversationId: string,
  messageId: string,
): Promise<{ conversation: AssistantConversation; task: Task }> =>
  apiRequest<{ conversation: AssistantConversation; task: Task }>(
    `/assistant/${conversationId}/messages/${messageId}/confirm`,
    { method: "POST" },
  );

export const dismissAssistantTaskRequest = async (
  conversationId: string,
  messageId: string,
): Promise<AssistantConversation> => {
  const data = await apiRequest<{ conversation: AssistantConversation }>(
    `/assistant/${conversationId}/messages/${messageId}/dismiss`,
    { method: "POST" },
  );
  return data.conversation;
};
