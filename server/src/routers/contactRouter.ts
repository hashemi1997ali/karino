import { Router } from "express";

import {
  createContact,
  getContactConfig,
  getContactReplySuggestions,
  listContactSubmissions,
  replyToContact,
  rewriteContactReply,
} from "#controllers";
import {
  authenticate,
  contactFormRateLimiter,
  requireActiveSession,
  requireCurrentStaff,
  suggestionRateLimiter,
  validateByZod,
} from "#middlewares";
import {
  contactReplyRewriteSchema,
  contactReplySchema,
  createContactSchema,
} from "#schemas";

export const contactRouter = Router();

contactRouter.get("/config", getContactConfig);
contactRouter.post(
  "/",
  contactFormRateLimiter,
  validateByZod(createContactSchema),
  createContact,
);

contactRouter.use(authenticate, requireActiveSession, requireCurrentStaff);
contactRouter.get("/admin", listContactSubmissions);
contactRouter.get(
  "/admin/:id/suggestions",
  suggestionRateLimiter,
  getContactReplySuggestions,
);
contactRouter.post(
  "/admin/:id/rewrite",
  suggestionRateLimiter,
  validateByZod(contactReplyRewriteSchema),
  rewriteContactReply,
);
contactRouter.post(
  "/admin/:id/replies",
  validateByZod(contactReplySchema),
  replyToContact,
);
