import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient, spaced } from "../lib/client.ts";
import { FILTER_PARAMS, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v2/systemgroups` (**V2**) — verified against JumpCloud's V2
 * OpenAPI document (`groups_system_list`).
 *
 * Device groups are what policies and commands attach to, so a command bound to
 * one runs on every machine in it — which is the fan-out `command-run` warns
 * about.
 */
const action: ActionDefinition = {
  key: "system-group-list",
  type: "read",
  resource: "system-group",
  title: "List device groups",
  description: "List device groups, which policies and commands attach to.",
  params: [...FILTER_PARAMS, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing JumpCloud device groups", { returnAll, limit });

    return await new JumpCloudClient(ctx).requestAll("/systemgroups", {
      api: "v2",
      query: {
        filter: (p.filter as string) || undefined,
        sort: spaced(p.sort),
        fields: spaced(p.fields),
      },
    }, returnAll ? Infinity : limit);
  },
};

export default action;
