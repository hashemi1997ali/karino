import { apiRequest } from "@/lib/api-client";
import type { User } from "@/lib/types";

export interface LoginValues {
  email: string;
  password: string;
}

export interface RegisterValues extends LoginValues {
  firstName: string;
  lastName: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
}

export const loginRequest = (values: LoginValues): Promise<AuthResult> =>
  apiRequest<AuthResult>("/auth/login", {
    method: "POST",
    json: values,
    auth: false,
    retryAuth: false,
  });

export const registerRequest = (values: RegisterValues): Promise<AuthResult> =>
  apiRequest<AuthResult>("/auth/register", {
    method: "POST",
    json: values,
    auth: false,
    retryAuth: false,
  });

export const getMeRequest = async (): Promise<User> => {
  const data = await apiRequest<{ user: User }>("/auth/me");
  return data.user;
};

export const logoutRequest = (): Promise<void> =>
  apiRequest<void>("/auth/logout", {
    method: "POST",
    auth: false,
    retryAuth: false,
  });
