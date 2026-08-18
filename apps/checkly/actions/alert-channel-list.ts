import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/alert-channels` — verified against Checkly's OpenAPI document.
 *
 * Answers a bare array, like every list endpoint here, so the walk stops on a
 * page shorter than the one it asked for.
 */
const action: ActionDefinition = {
  key: "alert-channel-list",
  type: "read",
  resource: "alert-channel",
  title: "List alert channels",
  description: "List alert channels — where failures are sent.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Checkly alert-channel records", { returnAll, limit });

    return await new ChecklyClient(ctx).requestAll(
      "/v1/alert-channels",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
