import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient, spaced } from "../lib/client.ts";
import { FILTER_PARAMS, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/commands` (V1) — verified against JumpCloud's V1 OpenAPI document
 * (`commands_list`).
 *
 * A JumpCloud "command" is a saved script with a target set, not an invocation.
 * Listing them is how a workflow finds the `_id` that `command-run` triggers.
 */
const action: ActionDefinition = {
  key: "command-list",
  type: "read",
  resource: "command",
  title: "List commands",
  description: "List saved commands, which are scripts with a target set.",
  params: [...FILTER_PARAMS, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing JumpCloud commands", { returnAll, limit });

    return await new JumpCloudClient(ctx).requestAll("/commands", {
      query: {
        filter: (p.filter as string) || undefined,
        sort: spaced(p.sort),
        fields: spaced(p.fields),
      },
    }, returnAll ? Infinity : limit);
  },
};

export default action;
