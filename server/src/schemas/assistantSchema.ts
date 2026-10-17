import { z } from "zod";

const assistantContentSchema = z.string().trim().min(1).max(4000);
// IANA zone from the browser (e.g. "Europe/Berlin"); validated again by Intl.
const timeZoneSchema = z.string().trim().max(64).optional();

export const createAssistantConversationSchema = z
  .object({
    message: assistantContentSchema,
    locale: z.enum(["en", "de"]).optional().default("en"),
    timeZone: timeZoneSchema,
  })
  .strict();

export const sendAssistantMessageSchema = z
  .object({
    message: assistantContentSchema,
    locale: z.enum(["en", "de"]).optional().default("en"),
    timeZone: timeZoneSchema,
  })
  .strict();
