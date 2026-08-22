import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /deployments` — verified against Replicate's OpenAPI document.
 *
 * Cursor-paged like everything else here: `next` is a complete URL rather than
 * a token, and the client follows it verbatim.
 */
const action: ActionDefinition = {
  key: "deployment-list",
  type: "read",
  resource: "deployment",
  title: "List deployments",
  description: "Deployments — a model pinned to hardware you control the scale of.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Replicate deployment records", { returnAll, limit });

    return await new ReplicateClient(ctx).requestAll(
      "/deployments",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
