import { rateLimit } from "express-rate-limit";

import { getPositiveIntegerEnv } from "#utils";

const standardOptions = {
  standardHeaders: "draft-8" as const,
  legacyHeaders: false,
  passOnStoreError: false,
};

const ipOptions = {
  ...standardOptions,
  ipv6Subnet: 56,
};

export const registerRateLimiter = rateLimit({
  ...ipOptions,
  identifier: "auth-register",
  windowMs: getPositiveIntegerEnv("AUTH_REGISTER_RATE_WINDOW_MS", 60 * 60 * 1000),
  limit: getPositiveIntegerEnv("AUTH_REGISTER_RATE_LIMIT", 5),
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later",
  },
});

export const loginRateLimiter = rateLimit({
  ...ipOptions,
  identifier: "auth-login",
  windowMs: getPositiveIntegerEnv("AUTH_LOGIN_RATE_WINDOW_MS", 15 * 60 * 1000),
  limit: getPositiveIntegerEnv("AUTH_LOGIN_RATE_LIMIT", 10),
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many failed login attempts. Please try again later",
  },
});

export const refreshIpRateLimiter = rateLimit({
  ...ipOptions,
  identifier: "auth-refresh",
  windowMs: getPositiveIntegerEnv("AUTH_REFRESH_RATE_WINDOW_MS", 15 * 60 * 1000),
  limit: getPositiveIntegerEnv("AUTH_REFRESH_RATE_LIMIT", 30),
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many failed token refresh attempts. Please try again later",
  },
});

export const refreshSessionRateLimiter = rateLimit({
  ...standardOptions,
  identifier: "auth-refresh-session",
  windowMs: getPositiveIntegerEnv("AUTH_REFRESH_SESSION_RATE_WINDOW_MS", 15 * 60 * 1000),
  limit: getPositiveIntegerEnv("AUTH_REFRESH_SESSION_RATE_LIMIT", 30),
  keyGenerator: (request) =>
    request.refreshAuth?.sessionId ?? "unverified-refresh-session",
  message: {
    success: false,
    message: "Too many refreshes for this session. Please try again later",
  },
});

export const guestChatRateLimiter = rateLimit({
  ...ipOptions,
  identifier: "chat-guest",
  windowMs: getPositiveIntegerEnv("CHAT_GUEST_RATE_WINDOW_MS", 15 * 60 * 1000),
  limit: getPositiveIntegerEnv("CHAT_GUEST_RATE_LIMIT", 20),
  message: {
    success: false,
    message: "Too many assistant requests. Please try again later",
  },
});

export const authenticatedChatRateLimiter = rateLimit({
  ...standardOptions,
  identifier: "chat-authenticated",
  windowMs: getPositiveIntegerEnv("CHAT_AUTH_RATE_WINDOW_MS", 15 * 60 * 1000),
  limit: getPositiveIntegerEnv("CHAT_AUTH_RATE_LIMIT", 80),
  keyGenerator: (request) => request.user?.userId ?? "unauthenticated-chat-user",
  message: {
    success: false,
    message: "Too many chat requests. Please try again later",
  },
});

export const suggestionRateLimiter = rateLimit({
  ...standardOptions,
  identifier: "chat-suggestions",
  windowMs: getPositiveIntegerEnv("CHAT_SUGGESTION_RATE_WINDOW_MS", 15 * 60 * 1000),
  limit: getPositiveIntegerEnv("CHAT_SUGGESTION_RATE_LIMIT", 30),
  keyGenerator: (request) => request.user?.userId ?? "unauthenticated-support-user",
  message: {
    success: false,
    message: "Too many suggestion requests. Please try again later",
  },
});

export const contactFormRateLimiter = rateLimit({
  ...ipOptions,
  identifier: "contact-form",
  windowMs: getPositiveIntegerEnv("CONTACT_FORM_RATE_WINDOW_MS", 15 * 60 * 1000),
  limit: getPositiveIntegerEnv("CONTACT_FORM_RATE_LIMIT", 5),
  message: {
    success: false,
    message: "Too many contact messages. Please try again later",
  },
});

export const passwordResetRateLimiter = rateLimit({
  ...ipOptions,
  identifier: "password-reset",
  windowMs: getPositiveIntegerEnv("PASSWORD_RESET_RATE_WINDOW_MS", 15 * 60 * 1000),
  limit: getPositiveIntegerEnv("PASSWORD_RESET_RATE_LIMIT", 5),
  message: {
    success: false,
    message: "Too many password reset requests. Please try again later",
  },
});
