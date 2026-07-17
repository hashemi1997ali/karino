import type { BanReason, TaskPriority, TaskStatus, UserRole } from "@/lib/types";
import type { Locale } from "@/lib/preferences";

const banReasonLabels: Record<Locale, Record<BanReason, string>> = {
  en: {
    spam: "Spam",
    "abusive-behavior": "Abusive behavior",
    harassment: "Harassment",
    fraud: "Fraud",
    "terms-violation": "Terms violation",
    security: "Security risk",
    other: "Other",
  },
  de: {
    spam: "Spam",
    "abusive-behavior": "Missbräuchliches Verhalten",
    harassment: "Belästigung",
    fraud: "Betrug",
    "terms-violation": "Verstoß gegen die Nutzungsbedingungen",
    security: "Sicherheitsrisiko",
    other: "Sonstiges",
  },
};

const roleLabels: Record<Locale, Record<UserRole, string>> = {
  en: {
    user: "Regular user",
    admin: "Administrator",
    super_admin: "Super administrator",
  },
  de: {
    user: "Standardbenutzer",
    admin: "Administrator",
    super_admin: "Super-Administrator",
  },
};

const taskStatusLabels: Record<Locale, Record<TaskStatus, string>> = {
  en: {
    todo: "To do",
    "in-progress": "In progress",
    done: "Done",
  },
  de: {
    todo: "Offen",
    "in-progress": "In Bearbeitung",
    done: "Erledigt",
  },
};

const taskPriorityLabels: Record<Locale, Record<TaskPriority, string>> = {
  en: {
    low: "Low",
    medium: "Medium",
    high: "High",
  },
  de: {
    low: "Niedrig",
    medium: "Mittel",
    high: "Hoch",
  },
};

const assistantAgentLabels: Record<Locale, Record<string, string>> = {
  en: {
    "site-guide": "Site guide",
    "account-helper": "Account assistant",
    "support-triage": "Support assistant",
    "staff-operations": "Staff assistant",
  },
  de: {
    "site-guide": "Website-Hilfe",
    "account-helper": "Konto-Assistent",
    "support-triage": "Support-Assistent",
    "staff-operations": "Team-Assistent",
  },
};

export const getBanReasonLabel = (reason: BanReason, locale: Locale): string =>
  banReasonLabels[locale][reason];

export const getUserRoleLabel = (role: UserRole, locale: Locale): string =>
  roleLabels[locale][role];

export const getTaskStatusLabel = (status: TaskStatus, locale: Locale): string =>
  taskStatusLabels[locale][status];

export const getTaskPriorityLabel = (priority: TaskPriority, locale: Locale): string =>
  taskPriorityLabels[locale][priority];

export const getAssistantAgentLabel = (agent: string, locale: Locale): string =>
  assistantAgentLabels[locale][agent] ?? agent;
