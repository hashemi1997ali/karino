import { apiRequest } from "@/lib/api-client";
import type { RefreshSession, User } from "@/lib/types";

export interface ProfileValues {
  firstName: string;
  lastName: string;
  email: string;
}

export const updateProfileRequest = async (values: ProfileValues): Promise<User> => {
  const data = await apiRequest<{ user: User }>("/auth/me", {
    method: "PATCH",
    json: values,
  });
  return data.user;
};

export const changePasswordRequest = (values: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> =>
  apiRequest<void>("/auth/me/password", { method: "PATCH", json: values });

export const getSessionsRequest = async (): Promise<RefreshSession[]> => {
  const data = await apiRequest<{ sessions: RefreshSession[] }>("/auth/sessions");
  return data.sessions;
};

export const logoutOtherSessionsRequest = (): Promise<void> =>
  apiRequest<void>("/auth/sessions/others", { method: "DELETE" });

export const revokeSessionRequest = (id: string): Promise<void> =>
  apiRequest<void>(`/auth/sessions/${id}`, { method: "DELETE" });

export const logoutAllSessionsRequest = (): Promise<void> =>
  apiRequest<void>("/auth/sessions", { method: "DELETE" });
