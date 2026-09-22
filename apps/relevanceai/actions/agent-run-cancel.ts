import type { ActionDefinition } from "@w6w/types";
import { encodeId, RelevanceAiClient } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `POST /agents/{agent_id}/cancel` — stop an agent's runs.
 *
 * `CancelAgentInput` and `CancelAgentOutput` are both **empty objects** in the
 * live schema — no body, no response — so this is a fire-and-forget POST with
 * `{}` for a body and nothing to unwrap. Live, unauthenticated, it answers the
 * standard JSON error envelope (`401 authorization_header_missing`) rather than
 * a 404, which is what identifies the route; a successful call answers 200 with
 * an empty body, which `lib/client.ts` returns as `undefined`.
 *
 * ## Why it is marked idempotent
 *
 * Cancelling an already-cancelled (or finished) run is not a second side effect,
 * and the endpoint takes no idempotency key. Saying so is what lets the runtime
 * retry a dropped connection instead of failing the step — the same reasoning
 * Apify's `run-abort` uses. Note it is the *agent* id, not a run id, that this
 * route takes.
 */
interface Input {
  agentId: string;
}

const agentRunCancel: ActionDefinition<Input> = {
  key: "agent-run-cancel",
  type: "perform",
  resource: "agent",
  idempotent: true,
  title: "Cancel Agent Run",
  description: "Cancel the in-flight run(s) of an agent.",
  params: [agentIdParam],
  output: [{ key: "cancelled", type: "boolean", label: "Request accepted" }],

  async execute(input, ctx) {
    ctx.log("info", "cancelling agent run", { agentId: input.agentId });
    await new RelevanceAiClient(ctx).json(`/agents/${encodeId(input.agentId)}/cancel`, {
      method: "POST",
      body: {},
    });
    // The vendor declares no output at all, so the only readable fact is that
    // the call was accepted — reported as a boolean rather than an empty object.
    return { cancelled: true };
  },
};

export default agentRunCancel;
