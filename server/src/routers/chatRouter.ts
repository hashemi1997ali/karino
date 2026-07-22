import { Router } from "express";

import {
  claimStaffChat,
  createChat,
  endGuestChat,
  endOwnChat,
  endStaffChat,
  escalateOwnChat,
  getGuestChat,
  getOwnChat,
  getStaffSuggestions,
  guestAssistant,
  listOwnChats,
  listStaffChats,
  rateOwnChat,
  sendOwnMessage,
  sendStaffMessage,
  transferStaffChat,
} from "#controllers";
import {
  authenticate,
  authenticatedChatRateLimiter,
  guestChatRateLimiter,
  requireActiveSession,
  requireCurrentStaff,
  suggestionRateLimiter,
  validateByZod,
} from "#middlewares";
import {
  createChatSchema,
  guestAssistantSchema,
  rateChatSchema,
  sendChatMessageSchema,
  supportMessageSchema,
} from "#schemas";

export const chatRouter = Router();

chatRouter.post(
  "/guest",
  guestChatRateLimiter,
  validateByZod(guestAssistantSchema),
  guestAssistant,
);
chatRouter.get("/guest/:id", getGuestChat);
chatRouter.post("/guest/:id/end", guestChatRateLimiter, endGuestChat);

chatRouter.use(authenticate, requireActiveSession);

chatRouter.get("/staff/queue", requireCurrentStaff, listStaffChats);
chatRouter.post(
  "/staff/:id/claim",
  requireCurrentStaff,
  authenticatedChatRateLimiter,
  claimStaffChat,
);
chatRouter.post(
  "/staff/:id/messages",
  requireCurrentStaff,
  authenticatedChatRateLimiter,
  validateByZod(supportMessageSchema),
  sendStaffMessage,
);
chatRouter.post(
  "/staff/:id/transfer",
  requireCurrentStaff,
  authenticatedChatRateLimiter,
  transferStaffChat,
);
chatRouter.post(
  "/staff/:id/end",
  requireCurrentStaff,
  authenticatedChatRateLimiter,
  endStaffChat,
);
chatRouter.get(
  "/staff/:id/suggestions",
  requireCurrentStaff,
  suggestionRateLimiter,
  getStaffSuggestions,
);

chatRouter.get("/", listOwnChats);
chatRouter.post(
  "/",
  authenticatedChatRateLimiter,
  validateByZod(createChatSchema),
  createChat,
);
chatRouter.get("/:id", getOwnChat);
chatRouter.post(
  "/:id/messages",
  authenticatedChatRateLimiter,
  validateByZod(sendChatMessageSchema),
  sendOwnMessage,
);
chatRouter.post("/:id/escalate", authenticatedChatRateLimiter, escalateOwnChat);
chatRouter.post("/:id/end", authenticatedChatRateLimiter, endOwnChat);
chatRouter.post(
  "/:id/rating",
  authenticatedChatRateLimiter,
  validateByZod(rateChatSchema),
  rateOwnChat,
);
