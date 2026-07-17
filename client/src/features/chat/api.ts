import { apiRequest } from "@/lib/api-client";
import type { Pagination, SupportChat } from "@/lib/types";

export interface GuestMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantReply {
  reply: string;
  agent: string;
  provider: string;
}

export const guestChatRequest = (
  message: string,
  history: GuestMessage[],
  locale: "en" | "de",
): Promise<AssistantReply> =>
  apiRequest<AssistantReply>("/chat/guest", {
    method: "POST",
    auth: false,
    json: { message, history, locale },
  });

export const listChatsRequest = async (): Promise<SupportChat[]> => {
  const data = await apiRequest<{ chats: SupportChat[] }>("/chat");
  return data.chats;
};

export const createChatRequest = async (
  message: string,
  locale: "en" | "de",
): Promise<SupportChat> => {
  const data = await apiRequest<{ chat: SupportChat }>("/chat", {
    method: "POST",
    json: { message, locale },
  });
  return data.chat;
};

export const sendChatMessageRequest = async (
  id: string,
  message: string,
  locale: "en" | "de",
): Promise<SupportChat> => {
  const data = await apiRequest<{ chat: SupportChat }>(`/chat/${id}/messages`, {
    method: "POST",
    json: { message, locale },
  });
  return data.chat;
};

export const escalateChatRequest = async (id: string): Promise<SupportChat> => {
  const data = await apiRequest<{ chat: SupportChat }>(`/chat/${id}/escalate`, {
    method: "POST",
  });
  return data.chat;
};

export const endChatRequest = async (id: string): Promise<SupportChat> => {
  const data = await apiRequest<{ chat: SupportChat }>(`/chat/${id}/end`, {
    method: "POST",
  });
  return data.chat;
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

export const listStaffChatsRequest = async (
  status?: "open" | "active" | "ended",
): Promise<{ chats: SupportChat[]; pagination: Pagination }> => {
  const query = new URLSearchParams({ limit: "50" });
  if (status) query.set("status", status);
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
