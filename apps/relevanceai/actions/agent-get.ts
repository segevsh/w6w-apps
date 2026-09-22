import type { ActionDefinition } from "@w6w/types";
import { encodeId, RelevanceAiClient } from "../lib/client.ts";
import { agentIdParam, versionParam } from "../lib/params.ts";

/**
 * `GET /agents/{agent_id}/get` — one agent's full definition.
 *
 * `GetAgentOutput` is `{agent: {...}}` with 79 properties inside — the agent's
 * params, steps, runner configuration, views, marketplace flags and so on. The
 * whole object is passed through as one `object` output rather than enumerated
 * field by field, the way this pack handles every vendor "get full resource"
 * endpoint: hand-transcribing 79 fields would be a lot of surface to get subtly
 * wrong, and the schema is the vendor's to change.
 *
 * The stale-looking `abc` in the live probe is not a 404 on the route: with no
 * credential, `GET /agents/abc/get` answers `404 {"message":"Agent abc not
 * found","error_type":"agent_not_found"}`, i.e. the route dispatch ran and went
 * looking for the agent. A nonexistent path on this host answers Express's HTML
 * `Cannot GET …` instead.
 *
 * The id's own constraint (`^[a-zd._-]+$`, max 240 characters) is documented in
 * the param's hint rather than re-enforced here: a bad id is answered by the
 * vendor with `agent_not_found`, which says more than a local pattern check
 * could.
 */
interface Input {
  agentId: string;
  version?: string;
}

const agentGet: ActionDefinition<Input> = {
  key: "agent-get",
  type: "read",
  resource: "agent",
  title: "Get Agent",
  description: "Fetch one agent's full definition, optionally at a specific version.",
  params: [agentIdParam, versionParam],
  output: [{ key: "agent", type: "object", label: "The agent definition" }],

  execute(input, ctx) {
    return new RelevanceAiClient(ctx).json(`/agents/${encodeId(input.agentId)}/get`, {
      query: { version: input.version },
    });
  },
};

export default agentGet;
