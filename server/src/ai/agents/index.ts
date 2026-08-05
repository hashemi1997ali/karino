/** Agent registry — maps reply-agent ids to their implementations. */

import type { ReplyAgentId } from "../types.ts";
import type { Agent } from "./base.ts";
import { websiteHelpAgent } from "./websiteHelpAgent.ts";
import { staffAgent } from "./staffAgent.ts";

export type { Agent } from "./base.ts";
export { websiteHelpAgent } from "./websiteHelpAgent.ts";
export { staffAgent } from "./staffAgent.ts";
export { runTaskAgent } from "./taskAgent.ts";

/**
 * LLM-backed agents keyed by id. Provider unavailability is handled as a
 * response state and is not registered as an agent.
 */
export const AGENTS: Partial<Record<ReplyAgentId, Agent>> = {
  "website-help": websiteHelpAgent,
  staff: staffAgent,
};
