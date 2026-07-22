import { z } from "zod";

import { CONTACT_STATUSES } from "#models";
import { emailSchema, firstNameSchema, lastNameSchema } from "./authSchema.ts";

const messageSchema = z.string().trim().min(10).max(5000);

export const createContactSchema = z
  .object({
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    email: emailSchema,
    message: messageSchema,
    locale: z.enum(["en", "de"]).optional().default("en"),
  })
  .strict();

export const contactReplySchema = z
  .object({ message: z.string().trim().min(1).max(5000) })
  .strict();

export const contactListQuerySchema = z
  .object({
    status: z.enum(CONTACT_STATUSES).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  })
  .strict();
