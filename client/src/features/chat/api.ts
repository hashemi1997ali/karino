import { apiRequest } from "@/lib/api-client";
import type { ChatStatus, Pagination, SupportChat } from "@/lib/types";

export interface ChatEscalationResult {
  requested: boolean;
  completed: boolean;
  reason: SupportChat["escalationReason"];
}

export interface ChatTurnResult {
  chat: SupportChat;
  provider: string | null;
  escalation: ChatEscalationResult;
}

export interface EndChatResult {
  chat: SupportChat;
  deleted: boolean;
}

export const guestChatRequest = (
  message: string,
  locale: "en" | "de",
  chatId?: string,
): Promise<ChatTurnResult> =>
  apiRequest<ChatTurnResult>("/chat/guest", {
    method: "POST",
    auth: false,
    json: { message, locale, ...(chatId ? { chatId } : {}) },
  });

export const getGuestChatRequest = async (id: string): Promise<SupportChat> => {
  const data = await apiRequest<{ chat: SupportChat }>(`/chat/guest/${id}`, {
    auth: false,
  });
  return data.chat;
};

export const endGuestChatRequest = async (id: string): Promise<EndChatResult> => {
  return apiRequest<EndChatResult>(`/chat/guest/${id}/end`, {
    method: "POST",
    auth: false,
  });
};

export const listChatsRequest = async (): Promise<SupportChat[]> => {
  const data = await apiRequest<{ chats: SupportChat[] }>("/chat");
  return data.chats;
};

export const createChatRequest = (
  message: string,
  locale: "en" | "de",
): Promise<ChatTurnResult> =>
  apiRequest<ChatTurnResult>("/chat", {
    method: "POST",
    json: { message, locale },
  });

export const sendChatMessageRequest = (
  id: string,
  message: string,
  locale: "en" | "de",
): Promise<ChatTurnResult> =>
  apiRequest<ChatTurnResult>(`/chat/${id}/messages`, {
    method: "POST",
    json: { message, locale },
  });

// Kept for backwards compatibility with older clients. The current UI relies
// on automatic server-side escalation and does not expose this action.
export const escalateChatRequest = async (id: string): Promise<SupportChat> => {
  const data = await apiRequest<{ chat: SupportChat }>(`/chat/${id}/escalate`, {
    method: "POST",
  });
  return data.chat;
};

export const endChatRequest = async (id: string): Promise<EndChatResult> => {
  return apiRequest<EndChatResult>(`/chat/${id}/end`, {
    method: "POST",
  });
};

export const rateChatRequest = async (
  id: string,
  score: number,
  reason: string,
): Promise<SupportChat> => {
  const data = await apiRequest<{ chat: SupportChat }>(`/chat/${id}/rating`, {
    method: "POST",
    json: { score, reason },
  });
  return data.chat;
};

export interface StaffChatListOptions {
  status?: ChatStatus;
  scope?: "queue" | "all";
  page?: number;
  limit?: number;
}

export const listStaffChatsRequest = async (
  options: StaffChatListOptions = {},
): Promise<{ chats: SupportChat[]; pagination: Pagination }> => {
  const query = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 50),
    scope: options.scope ?? "queue",
  });
  if (options.status) query.set("status", options.status);
  return apiRequest<{ chats: SupportChat[]; pagination: Pagination }>(
    `/chat/staff/queue?${query.toString()}`,
  );
};

export const claimStaffChatRequest = async (id: string): Promise<SupportChat> => {
  const data = await apiRequest<{ chat: SupportChat }>(`/chat/staff/${id}/claim`, {
    method: "POST",
  });
  return data.chat;
};

export const sendStaffMessageRequest = async (
  id: string,
  message: string,
): Promise<SupportChat> => {
  const data = await apiRequest<{ chat: SupportChat }>(`/chat/staff/${id}/messages`, {
    method: "POST",
    json: { message },
  });
  return data.chat;
};

export const transferStaffChatRequest = async (id: string): Promise<SupportChat> => {
  const data = await apiRequest<{ chat: SupportChat }>(`/chat/staff/${id}/transfer`, {
    method: "POST",
  });
  return data.chat;
};

export const endStaffChatRequest = async (id: string): Promise<SupportChat> => {
  const data = await apiRequest<{ chat: SupportChat }>(`/chat/staff/${id}/end`, {
    method: "POST",
  });
  return data.chat;
};

export const getStaffSuggestionsRequest = async (
  id: string,
  locale: "en" | "de",
): Promise<string[]> => {
  const data = await apiRequest<{ suggestions: string[] }>(
    `/chat/staff/${id}/suggestions?locale=${locale}`,
  );
  return data.suggestions;
};
