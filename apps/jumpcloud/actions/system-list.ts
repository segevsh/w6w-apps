import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient, spaced } from "../lib/client.ts";
import { FILTER_PARAMS, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/systems` (V1) — verified against JumpCloud's V1 OpenAPI document
 * (`systems_list`).
 *
 * A "system" is an enrolled device running the JumpCloud agent. `active` on a
 * record means the agent has checked in recently, not that the machine is
 * powered on right now — which matters for the device commands, since those
 * queue for an offline machine rather than failing.
 */
const action: ActionDefinition = {
  key: "system-list",
  type: "read",
  resource: "system",
  title: "List devices",
  description: "List enrolled devices, optionally filtered.",
  params: [
    ...FILTER_PARAMS,
    {
      key: "search",
      label: "Search Term",
      type: "string",
      default: "",
      hint: "Full-text search across the device record.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing JumpCloud devices", { returnAll, limit });

    return await new JumpCloudClient(ctx).requestAll("/systems", {
      query: {
        filter: (p.filter as string) || undefined,
        sort: spaced(p.sort),
        fields: spaced(p.fields),
        search: (p.search as string) || undefined,
      },
    }, returnAll ? Infinity : limit);
  },
};

export default action;
