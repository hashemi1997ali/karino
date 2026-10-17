import { z } from "zod";

import type { Locale } from "@/lib/preferences";

const validation = {
  en: {
    titleMin: "At least 3 characters",
    titleMax: "Max. 100 characters",
    descriptionMax: "Max. 2,000 characters",
  },
  de: {
    titleMin: "Mindestens 3 Zeichen",
    titleMax: "Höchstens 100 Zeichen",
    descriptionMax: "Höchstens 2.000 Zeichen",
  },
} as const;

export const createTaskFormSchema = (locale: Locale) => {
  const t = validation[locale];
  return z.object({
    title: z.string().trim().min(3, t.titleMin).max(100, t.titleMax),
    description: z.string().trim().max(2000, t.descriptionMax),
    status: z.enum(["todo", "in-progress", "done"]),
    priority: z.enum(["low", "medium", "high"]),
    dueDate: z.string(),
  });
};

export const taskFormSchema = createTaskFormSchema("en");
export type TaskFormValues = z.infer<ReturnType<typeof createTaskFormSchema>>;
