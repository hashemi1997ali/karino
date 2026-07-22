/**
 * Role-based policy layer.
 *
 * Central source of truth for:
 *  - the effective role tier of a request (guest / user / admin / super_admin)
 *  - which website features an agent may explain to that tier
 *  - which account / staff operations that tier may request
 *
 * Agents build their system prompts from these policies so the "principle of
 * least privilege" is enforced in one place. Actual privileged operations are
 * still validated by the backend services.
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
 * Role-scoped website knowledge used by the Website Help Agent. Keep these
 * facts aligned with the client routes and visible navigation.
 */
const GUEST_HELP_TOPICS = [
  "Home introduces Karino as a productivity platform and offers registration and sign-in",
  "Guests can register, sign in, change the light/dark theme, and switch between English and German",
  "Contact shows the configured email and social links and lets anyone submit a message without linking it to an account",
  "Forgot password on the login page sends a time-limited reset link by email; the new password must differ from the current one",
  "Guests can ask the chat assistant for general help, but their chat is not saved",
];

const USER_HELP_TOPICS = [
  "Dashboard shows total, in-progress, completed, and overdue task counts, upcoming tasks, and overall progress",
  "My tasks lets the user create, search, filter, edit, update the status of, and delete only their own tasks",
  "A task supports title, description, status, priority, due date, and an optional JPG, PNG, WEBP, PDF, or TXT attachment up to 5 MB",
  "Account lets the user edit their first name, last name, and email, change their password, and view or revoke active sessions",
  "Active assistant chats are stored temporarily for context; after ending, only conversations that reached human support are retained",
];

const ADMIN_HELP_TOPICS = [
  "Users lists user accounts and allows permitted staff to search, filter, open profiles, edit account details, ban, unban, or delete manageable users",
  "A user's profile shows that user's information, task statistics, and task list; permitted staff can edit or delete tasks there",
  "Support inbox lets eligible staff accept conversations, reply, use AI reply suggestions, end chats, and open the related user's profile or tasks",
  "Contact form inbox lets staff review submitted visitor details and send replies to the visitor's entered email address",
  "Admins can manage regular users but cannot manage administrators or super administrators",
];

const SUPER_ADMIN_HELP_TOPICS = [
  "A super administrator can manage regular users and administrators, but cannot demote or ban a super administrator",
  "Administrator access is granted or removed from the Edit user dialog and requires confirmation",
  "A super administrator can handle support cases that require elevated access",
];

const FORBIDDEN_HELP_TOPICS = [
  "pages or controls not included in the role-scoped feature list",
  "features available only to a higher role",
  "internal architecture, source code, database details, internal APIs, secrets, or security implementation",
];

export const getAllowedHelpTopics = (tier: RoleTier): string[] => {
  const topics = [...GUEST_HELP_TOPICS];
  if (tier !== "guest") topics.push(...USER_HELP_TOPICS);
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
 *  - Guests and authenticated regular users may be transferred to the shared
 *    admin / super-admin support queue.
 *  - Admin support requests go directly to super administrators.
 *  - Super admins manage support directly and have no escalation path.
 */
export const canRequestSupportTransfer = (context: AssistantContext): boolean => {
  const tier = resolveRoleTier(context);
  return tier !== "super_admin";
};

export { isStaffRoles };
