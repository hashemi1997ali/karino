/**
 * Shared helpers used by every provider implementation:
 *  - secret normalisation (rejects placeholder keys)
 *  - a fetch wrapper with an abortable timeout
 */

import { getPositiveIntegerEnv } from "#utils";

/**
 * Returns a trimmed secret, or `null` when the value is empty or an obvious
 * placeholder (e.g. "your_api_key", "replace-me"). Prevents accidentally
 * calling a provider with a dummy key committed to `.env.example`.
 */
export const normalizeSecret = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  if (!normalized || /replace|your_.*key|example/i.test(normalized)) return null;
  return normalized;
};

/** `fetch` with an abort-based timeout controlled by `AI_TIMEOUT_MS`. */
export const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    getPositiveIntegerEnv("AI_TIMEOUT_MS", 25_000),
  );

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};
