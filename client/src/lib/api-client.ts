import { ApiError } from "@/lib/api-error";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/features/auth/token-vault";
import type { ValidationIssue } from "@/lib/types";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: ValidationIssue[];
}

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | null;
  json?: unknown;
  auth?: boolean;
  retryAuth?: boolean;
}

let refreshPromise: Promise<string> | null = null;

const parseResponse = async <T>(response: Response): Promise<ApiEnvelope<T>> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return { success: response.ok };
  }

  return (await response.json()) as ApiEnvelope<T>;
};

const performRefresh = async (): Promise<string> => {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  const payload = await parseResponse<{ accessToken: string }>(response);

  if (!response.ok || !payload.data?.accessToken) {
    clearAccessToken({ broadcast: true });
    const message = payload.message ?? "Your session has expired. Please sign in again.";
    throw new ApiError(message, response.status, payload.errors);
  }

  setAccessToken(payload.data.accessToken, { broadcast: true });
  return payload.data.accessToken;
};

const runWithCrossTabLock = async (rejectedToken?: string | null): Promise<string> => {
  if (typeof navigator === "undefined" || !("locks" in navigator)) {
    return performRefresh();
  }

  return navigator.locks.request("task-manager-refresh", async () => {
    const currentToken = getAccessToken();
    if (currentToken && currentToken !== rejectedToken) return currentToken;
    return performRefresh();
  });
};

export const refreshAccessToken = (rejectedToken?: string | null): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = runWithCrossTabLock(rejectedToken).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

export const apiRequest = async <T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const {
    auth = true,
    retryAuth = true,
    json,
    body,
    headers: initialHeaders,
    ...requestOptions
  } = options;
  const headers = new Headers(initialHeaders);
  const token = auth ? getAccessToken() : null;

  if (token) headers.set("Authorization", `Bearer ${token}`);

  let requestBody = body;
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    requestBody = JSON.stringify(json);
  }

  const response = await fetch(`/api${path}`, {
    ...requestOptions,
    headers,
    body: requestBody,
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401 && auth && retryAuth) {
    await refreshAccessToken(token);
    return apiRequest<T>(path, { ...options, retryAuth: false });
  }

  const payload = await parseResponse<T>(response);

  if (!response.ok) {
    const message = payload.message ?? "The server could not process the request.";
    throw new ApiError(message, response.status, payload.errors);
  }

  return payload.data as T;
};
