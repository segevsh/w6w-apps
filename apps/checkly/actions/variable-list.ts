import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/variables` — verified against Checkly's OpenAPI document.
 *
 * Answers a bare array, like every list endpoint here, so the walk stops on a
 * page shorter than the one it asked for.
 */
const action: ActionDefinition = {
  key: "variable-list",
  type: "read",
  resource: "variable",
  title: "List environment variables",
  description: "List environment variables available to checks.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Checkly variable records", { returnAll, limit });

    return await new ChecklyClient(ctx).requestAll(
      "/v1/variables",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
