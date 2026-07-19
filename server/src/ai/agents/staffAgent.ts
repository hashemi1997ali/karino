/**
 * Staff Agent.
 *
 * Available only to admins and super admins. It explains and guides staff
 * operations, but never performs a privileged action itself. Real actions run
 * through the explicit chat commands (`/ban`, `/unban`, `/promote`,
 * `/demote`, `/user`) parsed by the chat controller, which re-validates every
 * permission against the backend (`canManageBan`, `setAdministratorRole`).
 */

import type { AgentInput, AgentOutput } from "../types.ts";
import type { Agent } from "./base.ts";
import { commonPromptRules, completeOrFallback, tierOf } from "./base.ts";
import { getStaffCapabilities, type RoleTier } from "../policies/index.ts";

/** Lists the explicit commands the current staff tier may run. */
const commandsFor = (tier: RoleTier): string => {
  const caps = getStaffCapabilities(tier);
  const commands: string[] = [];
  if (caps.viewUserStatus) commands.push("/user <email> — view a user's status");
  if (caps.banUsers) commands.push("/ban <email> <reason> — ban an allowed account");
  if (caps.unbanUsers) commands.push("/unban <email> — remove a ban");
  if (caps.promoteAdmin) commands.push("/promote <email> — grant the admin role");
  if (caps.demoteAdmin) commands.push("/demote <email> — remove the admin role");
  return commands.join("\n");
};

const buildPrompt = (input: AgentInput): string => {
  const tier = tierOf(input.context);
  const caps = getStaffCapabilities(tier);

  const scope =
    tier === "super_admin"
      ? "As a super admin you may ban/unban users, view user status, and promote or demote admins. You must never ban a super admin."
      : "As an admin you may ban/unban regular users and view user status. You must NOT manage admins or super admins.";

  return [
    commonPromptRules(input.context.locale),
    `Role of the current user: ${tier}.`,
    scope,
    "You never execute an action yourself. Administrative actions run only through explicit commands, and the backend re-checks every permission.",
    `Available commands for this user:\n${commandsFor(tier)}`,
    "Every administrative action requires confirmation and is logged by the backend. If a permission or target role is invalid, the backend will reject it — do not claim success.",
    caps.promoteAdmin
      ? ""
      : "If asked to manage admins or super admins, explain that only a super admin can do that.",
  ]
    .filter(Boolean)
    .join("\n");
};

export const staffAgent: Agent = {
  id: "staff",
  run: (input: AgentInput): Promise<AgentOutput> =>
    completeOrFallback(buildPrompt(input), input),
};
