import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient, spaced } from "../lib/client.ts";
import { FILTER_PARAMS, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/systemusers` (V1) — verified against JumpCloud's V1 OpenAPI
 * document (`systemusers_list`).
 *
 * "System user" is JumpCloud's name for a directory user — a person, not a
 * service account. The noun is a leftover from when JumpCloud was device
 * management, and it is kept on the wire while these actions call them users.
 */
const action: ActionDefinition = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List users",
  description: "List directory users, optionally filtered.",
  params: [
    ...FILTER_PARAMS,
    {
      key: "search",
      label: "Search Term",
      type: "string",
      default: "",
      hint: "Full-text search across the user record.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing JumpCloud users", { returnAll, limit });

    return await new JumpCloudClient(ctx).requestAll("/systemusers", {
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
