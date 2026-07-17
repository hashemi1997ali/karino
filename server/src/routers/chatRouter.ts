import { Router } from "express";

import {
  claimStaffChat,
  createChat,
  endOwnChat,
  endStaffChat,
  escalateOwnChat,
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

chatRouter.use(authenticate, requireActiveSession, authenticatedChatRateLimiter);

chatRouter.get("/staff/queue", requireCurrentStaff, listStaffChats);
chatRouter.post("/staff/:id/claim", requireCurrentStaff, claimStaffChat);
chatRouter.post(
  "/staff/:id/messages",
  requireCurrentStaff,
  validateByZod(supportMessageSchema),
  sendStaffMessage,
);
chatRouter.post("/staff/:id/transfer", requireCurrentStaff, transferStaffChat);
chatRouter.post("/staff/:id/end", requireCurrentStaff, endStaffChat);
chatRouter.get(
  "/staff/:id/suggestions",
  requireCurrentStaff,
  suggestionRateLimiter,
  getStaffSuggestions,
);

chatRouter.get("/", listOwnChats);
chatRouter.post("/", validateByZod(createChatSchema), createChat);
chatRouter.get("/:id", getOwnChat);
chatRouter.post("/:id/messages", validateByZod(sendChatMessageSchema), sendOwnMessage);
chatRouter.post("/:id/escalate", escalateOwnChat);
chatRouter.post("/:id/end", endOwnChat);
chatRouter.post("/:id/rating", validateByZod(rateChatSchema), rateOwnChat);
