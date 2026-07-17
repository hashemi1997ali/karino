import { z } from "zod";

import type { Locale } from "@/lib/preferences";

const copy = {
  en: {
    invalidEmail: "Enter a valid email address.",
    passwordRequired: "Enter your password.",
    passwordMin: "Password must be at least 8 characters long.",
    passwordLower: "Password must include at least one lowercase letter.",
    passwordUpper: "Password must include at least one uppercase letter.",
    passwordNumber: "Password must include at least one number.",
    firstNameMin: "First name must be at least 2 characters long.",
    lastNameMin: "Last name must be at least 2 characters long.",
    passwordMismatch: "Passwords do not match.",
    currentPasswordRequired: "Enter your current password.",
    newPasswordMismatch: "New passwords do not match.",
  },
  de: {
    invalidEmail: "Gib eine gültige E-Mail-Adresse ein.",
    passwordRequired: "Gib dein Passwort ein.",
    passwordMin: "Das Passwort muss mindestens 8 Zeichen lang sein.",
    passwordLower: "Das Passwort muss mindestens einen Kleinbuchstaben enthalten.",
    passwordUpper: "Das Passwort muss mindestens einen Großbuchstaben enthalten.",
    passwordNumber: "Das Passwort muss mindestens eine Zahl enthalten.",
    firstNameMin: "Der Vorname muss mindestens 2 Zeichen lang sein.",
    lastNameMin: "Der Nachname muss mindestens 2 Zeichen lang sein.",
    passwordMismatch: "Die Passwörter stimmen nicht überein.",
    currentPasswordRequired: "Gib dein aktuelles Passwort ein.",
    newPasswordMismatch: "Die neuen Passwörter stimmen nicht überein.",
  },
} as const;

const createStrongPasswordSchema = (locale: Locale) => {
  const t = copy[locale];
  return z
    .string()
    .min(8, t.passwordMin)
    .regex(/[a-z]/, t.passwordLower)
    .regex(/[A-Z]/, t.passwordUpper)
    .regex(/\d/, t.passwordNumber);
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
      firstName: z.string().trim().min(2, t.firstNameMin),
      lastName: z.string().trim().min(2, t.lastNameMin),
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
    firstName: z.string().trim().min(2, t.firstNameMin),
    lastName: z.string().trim().min(2, t.lastNameMin),
    email: z.string().trim().pipe(z.email(t.invalidEmail)),
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
    .refine((values) => values.newPassword === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t.newPasswordMismatch,
    });
};

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;
export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;
export type PasswordChangeFormValues = z.infer<
  ReturnType<typeof createPasswordChangeSchema>
>;

// English aliases keep existing imports compatible while feature forms migrate
// to the locale-aware factories above.
export const loginSchema = createLoginSchema("en");
export const registerSchema = createRegisterSchema("en");
export const profileSchema = createProfileSchema("en");
export const passwordChangeSchema = createPasswordChangeSchema("en");
