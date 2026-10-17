import { z } from "zod";

import type { Locale } from "@/lib/preferences";

const copy = {
  en: {
    invalidEmail: "Invalid email",
    passwordRequired: "Required",
    passwordWeak: "Too weak",
    nameMin: "At least 2 characters",
    passwordMismatch: "Doesn't match",
    currentPasswordRequired: "Required",
    newPasswordSame: "Same as current",
  },
  de: {
    invalidEmail: "Ungültige E-Mail",
    passwordRequired: "Erforderlich",
    passwordWeak: "Zu schwach",
    nameMin: "Mindestens 2 Zeichen",
    passwordMismatch: "Stimmt nicht überein",
    currentPasswordRequired: "Erforderlich",
    newPasswordSame: "Wie das aktuelle",
  },
} as const;

const createStrongPasswordSchema = (locale: Locale) => {
  const t = copy[locale];
  return z
    .string()
    .min(8, t.passwordWeak)
    .regex(/[a-z]/, t.passwordWeak)
    .regex(/[A-Z]/, t.passwordWeak)
    .regex(/\d/, t.passwordWeak);
};

export const createLoginSchema = (locale: Locale) => {
  const t = copy[locale];
  return z.object({
    email: z.string().trim().pipe(z.email(t.invalidEmail)),
    password: z.string().min(1, t.passwordRequired),
  });
};

export const createRegisterSchema = (locale: Locale) => {
  const t = copy[locale];
  return z
    .object({
      firstName: z.string().trim().min(2, t.nameMin),
      lastName: z.string().trim().min(2, t.nameMin),
      email: z.string().trim().pipe(z.email(t.invalidEmail)),
      password: createStrongPasswordSchema(locale),
      confirmPassword: z.string(),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t.passwordMismatch,
    });
};

export const createProfileSchema = (locale: Locale) => {
  const t = copy[locale];
  return z.object({
    firstName: z.string().trim().min(2, t.nameMin),
    lastName: z.string().trim().min(2, t.nameMin),
    email: z.string().trim().pipe(z.email(t.invalidEmail)),
    currentPassword: z.string().optional(),
  });
};

export const createPasswordChangeSchema = (locale: Locale) => {
  const t = copy[locale];
  return z
    .object({
      currentPassword: z.string().min(1, t.currentPasswordRequired),
      newPassword: createStrongPasswordSchema(locale),
      confirmPassword: z.string(),
    })
    .refine((values) => values.currentPassword !== values.newPassword, {
      path: ["newPassword"],
      message: t.newPasswordSame,
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t.passwordMismatch,
    });
};

export const createForgotPasswordSchema = (locale: Locale) => {
  const t = copy[locale];
  return z.object({ email: z.string().trim().pipe(z.email(t.invalidEmail)) });
};

export const createResetPasswordSchema = (locale: Locale) => {
  const t = copy[locale];
  return z
    .object({
      password: createStrongPasswordSchema(locale),
      confirmPassword: z.string(),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t.passwordMismatch,
    });
};

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;
export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;
export type PasswordChangeFormValues = z.infer<
  ReturnType<typeof createPasswordChangeSchema>
>;
export type ForgotPasswordFormValues = z.infer<
  ReturnType<typeof createForgotPasswordSchema>
>;
export type ResetPasswordFormValues = z.infer<
  ReturnType<typeof createResetPasswordSchema>
>;

// English aliases keep existing imports compatible while feature forms migrate
// to the locale-aware factories above.
export const loginSchema = createLoginSchema("en");
export const registerSchema = createRegisterSchema("en");
export const profileSchema = createProfileSchema("en");
export const passwordChangeSchema = createPasswordChangeSchema("en");
