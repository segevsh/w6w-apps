import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/audience-segments` — verified against Loops' OpenAPI document.
 *
 * Cursor-paged: the response is `{pagination: {…, nextCursor}, data: [...]}`
 * and `nextCursor` is **null** rather than absent on the last page.
 */
const action: ActionDefinition = {
  key: "audience-segment-list",
  type: "read",
  resource: "audience-segment",
  title: "List audience segments",
  description: "List the audience segments campaigns can target.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Loops audience-segment records", { returnAll, limit });

    return await new LoopsClient(ctx).requestAll(
      "/audience-segments",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
