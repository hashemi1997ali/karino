import { z } from "zod";

const assistantContentSchema = z.string().trim().min(1).max(4000);

export const createAssistantConversationSchema = z
  .object({
    message: assistantContentSchema,
    locale: z.enum(["en", "de"]).optional().default("en"),
  })
  .strict();

export const sendAssistantMessageSchema = z
  .object({
    message: assistantContentSchema,
    locale: z.enum(["en", "de"]).optional().default("en"),
  })
  .strict();
