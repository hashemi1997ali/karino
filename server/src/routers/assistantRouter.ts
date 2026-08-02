import { Router } from "express";

import {
  confirmAssistantTask,
  createAssistantConversation,
  dismissAssistantTask,
  listAssistantConversations,
  sendAssistantMessage,
} from "#controllers";
import {
  authenticate,
  authenticatedChatRateLimiter,
  requireActiveSession,
  validateByZod,
} from "#middlewares";
import { createAssistantConversationSchema, sendAssistantMessageSchema } from "#schemas";

export const assistantRouter = Router();

assistantRouter.use(authenticate, requireActiveSession);
assistantRouter.get("/", listAssistantConversations);
assistantRouter.post(
  "/",
  authenticatedChatRateLimiter,
  validateByZod(createAssistantConversationSchema),
  createAssistantConversation,
);
assistantRouter.post(
  "/:id/messages",
  authenticatedChatRateLimiter,
  validateByZod(sendAssistantMessageSchema),
  sendAssistantMessage,
);
assistantRouter.post(
  "/:id/messages/:messageId/confirm",
  authenticatedChatRateLimiter,
  confirmAssistantTask,
);
assistantRouter.post(
  "/:id/messages/:messageId/dismiss",
  authenticatedChatRateLimiter,
  dismissAssistantTask,
);
