import type { ActionDefinition } from "@w6w/types";
import { DeelClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /webhooks` — verified against Deel's own OpenAPI document
 * (`endpoints.json`, `get-webhooks`).
 */
const action: ActionDefinition = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List webhooks",
  description: "List the webhooks registered on this organization.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Deel webhooks", { returnAll, limit });

    return await new DeelClient(ctx).requestAllCursor(
      "/webhooks",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
