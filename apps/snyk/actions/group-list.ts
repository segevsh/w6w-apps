import type { ActionDefinition } from "@w6w/types";
import { SnykClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /groups` — verified against Snyk's own API document (`listGroups`).
 *
 * Groups sit above organizations, and a group id is what `issue-list-group`
 * needs for the cross-org view.
 */
const action: ActionDefinition = {
  key: "group-list",
  type: "read",
  resource: "group",
  title: "List groups",
  description: "List the groups this token can see.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Snyk groups", { returnAll, limit });

    return await new SnykClient(ctx).requestAll("/groups", {}, returnAll ? Infinity : limit);
  },
};

export default action;
