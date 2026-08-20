import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /collections` — verified against Replicate's OpenAPI document.
 *
 * Cursor-paged like everything else here: `next` is a complete URL rather than
 * a token, and the client follows it verbatim.
 */
const action: ActionDefinition = {
  key: "collection-list",
  type: "read",
  resource: "collection",
  title: "List collections",
  description: "Replicate's curated model collections.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Replicate collection records", { returnAll, limit });

    return await new ReplicateClient(ctx).requestAll(
      "/collections",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
