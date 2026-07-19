/** Agent registry — maps reply-agent ids to their implementations. */

import type { ReplyAgentId } from "../types.ts";
import type { Agent } from "./base.ts";
import { websiteHelpAgent } from "./websiteHelpAgent.ts";
import { accountAgent } from "./accountAgent.ts";
import { staffAgent } from "./staffAgent.ts";

export type { Agent } from "./base.ts";
export { websiteHelpAgent } from "./websiteHelpAgent.ts";
export { accountAgent } from "./accountAgent.ts";
export { staffAgent } from "./staffAgent.ts";

/**
 * LLM-backed agents keyed by id. The "offline" agent has no entry here — it is
 * handled directly by the orchestrator through the fallback module.
 */
export const AGENTS: Partial<Record<ReplyAgentId, Agent>> = {
  "website-help": websiteHelpAgent,
  account: accountAgent,
  staff: staffAgent,
};
