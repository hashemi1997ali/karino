import { Router } from "express";

import {
  createContact,
  getContactConfig,
  listContactSubmissions,
  replyToContact,
} from "#controllers";
import {
  authenticate,
  contactFormRateLimiter,
  requireActiveSession,
  requireCurrentStaff,
  validateByZod,
} from "#middlewares";
import { contactReplySchema, createContactSchema } from "#schemas";

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
contactRouter.post(
  "/admin/:id/replies",
  validateByZod(contactReplySchema),
  replyToContact,
);
