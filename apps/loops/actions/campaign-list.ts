import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/campaigns` — verified against Loops' OpenAPI document.
 *
 * Cursor-paged: the response is `{pagination: {…, nextCursor}, data: [...]}`
 * and `nextCursor` is **null** rather than absent on the last page.
 */
const action: ActionDefinition = {
  key: "campaign-list",
  type: "read",
  resource: "campaign",
  title: "List campaigns",
  description: "List campaigns and their state.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Loops campaign records", { returnAll, limit });

    return await new LoopsClient(ctx).requestAll("/campaigns", {}, returnAll ? Infinity : limit);
  },
};

export default action;
