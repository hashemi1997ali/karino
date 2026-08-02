import { apiRequest } from "@/lib/api-client";
import type { RefreshSession, User } from "@/lib/types";

export interface ProfileValues {
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: File | null;
  removeProfileImage?: boolean;
}

export const updateProfileRequest = async (values: ProfileValues): Promise<User> => {
  const formData = new FormData();
  formData.set("firstName", values.firstName);
  formData.set("lastName", values.lastName);
  formData.set("email", values.email);
  if (values.profileImage) formData.set("profileImage", values.profileImage);
  if (values.removeProfileImage) formData.set("removeProfileImage", "true");

  const data = await apiRequest<{ user: User }>("/auth/me", {
    method: "PATCH",
    body: formData,
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

export const deleteAccountRequest = (): Promise<void> =>
  apiRequest<void>("/auth/me", { method: "DELETE" });
