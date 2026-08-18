import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/event-patterns` — verified against Loops' OpenAPI document.
 *
 * Cursor-paged: the response is `{pagination: {…, nextCursor}, data: [...]}`
 * and `nextCursor` is **null** rather than absent on the last page.
 */
const action: ActionDefinition = {
  key: "event-pattern-list",
  type: "read",
  resource: "event-pattern",
  title: "List event patterns",
  description: "List the event names Loops has seen, which is what workflow triggers match on.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Loops event-pattern records", { returnAll, limit });

    return await new LoopsClient(ctx).requestAll(
      "/event-patterns",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
