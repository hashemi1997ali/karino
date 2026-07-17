import { z } from "zod";

const contentSchema = z.string().trim().min(1).max(4000);

export const guestAssistantSchema = z
  .object({
    message: contentSchema,
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: contentSchema,
          })
          .strict(),
      )
      .max(20)
      .optional()
      .default([]),
    locale: z.enum(["en", "de"]).optional().default("en"),
  })
  .strict();

export const createChatSchema = z
  .object({
    message: contentSchema,
    locale: z.enum(["en", "de"]).optional().default("en"),
  })
  .strict();

export const sendChatMessageSchema = z
  .object({
    message: contentSchema,
    locale: z.enum(["en", "de"]).optional().default("en"),
  })
  .strict();

export const supportMessageSchema = z
  .object({
    message: contentSchema,
  })
  .strict();

export const rateChatSchema = z
  .object({
    score: z.number().int().min(1).max(5),
    reason: z.string().trim().max(1000).optional().default(""),
  })
  .strict();

export const supportQueueQuerySchema = z
  .object({
    status: z.enum(["open", "active", "ended"]).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  })
  .strict();
