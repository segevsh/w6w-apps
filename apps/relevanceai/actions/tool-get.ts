import type { ActionDefinition } from "@w6w/types";
import { encodeId, RelevanceAiClient } from "../lib/client.ts";
import { toolIdParam, toolVersionParam } from "../lib/params.ts";

/**
 * `GET /studios/{studio_id}/get` — one tool's full definition.
 *
 * `GetStudioOutput` is `{studio: {...}}` with 42 properties: the tool's own
 * `params` schema, its steps, its transform/transformations, runner
 * configuration and so on. Passed through whole, like `agent-get`, because a
 * workflow that wants to know what a tool needs reads that schema directly.
 *
 * This is also the honest way to answer "what goes in `params`?" before calling
 * `tool-trigger`: the trigger input's `params` is free-form precisely because the
 * tool defines it, and the definition is here.
 */
interface Input {
  toolId: string;
  toolVersion?: string;
}

const toolGet: ActionDefinition<Input> = {
  key: "tool-get",
  type: "read",
  resource: "tool",
  title: "Get Tool",
  description: "Fetch one tool's full definition, optionally at a specific version.",
  params: [toolIdParam, toolVersionParam],
  output: [{ key: "studio", type: "object", label: "The tool definition" }],

  execute(input, ctx) {
    return new RelevanceAiClient(ctx).json(`/studios/${encodeId(input.toolId)}/get`, {
      query: { tool_version: input.toolVersion },
    });
  },
};

export default toolGet;
