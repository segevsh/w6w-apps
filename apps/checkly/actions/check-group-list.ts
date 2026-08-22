import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/check-groups` — verified against Checkly's OpenAPI document.
 *
 * Answers a bare array, like every list endpoint here, so the walk stops on a
 * page shorter than the one it asked for.
 */
const action: ActionDefinition = {
  key: "check-group-list",
  type: "read",
  resource: "check-group",
  title: "List check groups",
  description: "List check groups, which share settings and alerting across their checks.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Checkly check-group records", { returnAll, limit });

    return await new ChecklyClient(ctx).requestAll(
      "/v1/check-groups",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
