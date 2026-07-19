/**
 * Role-based policy layer.
 *
 * Central source of truth for:
 *  - the effective role tier of a request (guest / user / admin / super_admin)
 *  - which knowledge topics an agent may explain to that tier
 *  - which account / staff operations that tier may request
 *
 * Agents build their system prompts from these policies so the "principle of
 * least privilege" is enforced in one place. Actual privileged operations are
 * still validated by the backend services — this layer only shapes what the
 * assistant is *allowed to talk about*.
 */

import { isAdminRoles, isStaffRoles, isSuperAdminRoles } from "#utils";

import type { AssistantContext } from "../types.ts";

export type RoleTier = "guest" | "user" | "admin" | "super_admin";

/** Resolves the effective role tier from the request context. */
export const resolveRoleTier = (context: AssistantContext): RoleTier => {
  if (!context.authenticated) return "guest";
  if (isSuperAdminRoles(context.roles)) return "super_admin";
  if (isAdminRoles(context.roles)) return "admin";
  return "user";
};

export const isStaffTier = (tier: RoleTier): boolean =>
  tier === "admin" || tier === "super_admin";

/**
 * Website-help topics each tier may be taught, expressed as short English
 * phrases embedded in the agent system prompt. Higher tiers inherit the
 * topics of lower tiers.
 */
const GUEST_HELP_TOPICS = [
  "what Karino Task Manager is",
  "how to register an account",
  "how to log in",
  "general product features",
  "the contact page",
  "light/dark themes",
  "English and German language support",
];

const USER_HELP_TOPICS = [
  "the dashboard",
  "creating tasks",
  "editing tasks",
  "deleting tasks",
  "task status",
  "task priority",
  "task attachments",
  "the profile page",
  "the password page",
  "active-session management",
];

const ADMIN_HELP_TOPICS = [
  "the admin dashboard",
  "user management",
  "task moderation",
  "support chat management",
];

const SUPER_ADMIN_HELP_TOPICS = [
  "administrator management",
  "promoting a user to admin",
  "demoting an admin",
];

/** Topics the assistant must never explain, regardless of tier. */
const FORBIDDEN_HELP_TOPICS = [
  "internal architecture",
  "the database",
  "internal APIs or source code",
  "how security or authentication is implemented",
];

export const getAllowedHelpTopics = (tier: RoleTier): string[] => {
  const topics = [...GUEST_HELP_TOPICS];
  if (tier === "user" || isStaffTier(tier)) topics.push(...USER_HELP_TOPICS);
  if (isStaffTier(tier)) topics.push(...ADMIN_HELP_TOPICS);
  if (tier === "super_admin") topics.push(...SUPER_ADMIN_HELP_TOPICS);
  return topics;
};

export const getForbiddenHelpTopics = (): string[] => [...FORBIDDEN_HELP_TOPICS];

/** Account operations an authenticated user may request via the Account Agent. */
export const getAllowedAccountOperations = (tier: RoleTier): string[] => {
  if (tier === "guest") return [];
  return [
    "change first name",
    "change last name",
    "change email (must be unique)",
    "change password (requires the current password)",
    "view active sessions",
    "revoke active sessions",
  ];
};

export interface StaffCapabilities {
  banUsers: boolean;
  unbanUsers: boolean;
  viewUserStatus: boolean;
  promoteAdmin: boolean;
  demoteAdmin: boolean;
}

/**
 * Staff capabilities per tier. Admins manage regular users only; super admins
 * additionally manage admins. These flags describe what the assistant may
 * *offer*; the backend re-checks every action with `canManageBan` /
 * `setAdministratorRole`.
 */
export const getStaffCapabilities = (tier: RoleTier): StaffCapabilities => {
  if (tier === "admin") {
    return {
      banUsers: true,
      unbanUsers: true,
      viewUserStatus: true,
      promoteAdmin: false,
      demoteAdmin: false,
    };
  }
  if (tier === "super_admin") {
    return {
      banUsers: true,
      unbanUsers: true,
      viewUserStatus: true,
      promoteAdmin: true,
      demoteAdmin: true,
    };
  }
  return {
    banUsers: false,
    unbanUsers: false,
    viewUserStatus: false,
    promoteAdmin: false,
    demoteAdmin: false,
  };
};

/**
 * Support-transfer policy.
 *  - Guests may only be transferred for an account/ban problem (handled by the
 *    Account Agent after verifying the email).
 *  - Authenticated regular users and admins may request support normally.
 *  - Super admins manage support directly and have no escalation path.
 */
export const canRequestSupportTransfer = (context: AssistantContext): boolean => {
  const tier = resolveRoleTier(context);
  if (tier === "guest") return false;
  if (tier === "super_admin") return false;
  return true;
};

export { isStaffRoles };
