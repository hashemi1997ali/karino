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
    chatId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
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

export const rewriteSupportMessageSchema = z
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
    status: z.enum(["assistant", "open", "active", "ended"]).optional(),
    scope: z.enum(["queue", "all"]).optional().default("queue"),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  })
  .strict();
