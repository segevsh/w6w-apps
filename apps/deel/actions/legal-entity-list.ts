import type { ActionDefinition } from "@w6w/types";
import { DeelClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /legal-entities` — verified against Deel's own OpenAPI document
 * (`endpoints.json`, `get-legal-entities`).
 *
 * The entities a contract can be signed under, and the id `contract-list`
 * filters by.
 */
const action: ActionDefinition = {
  key: "legal-entity-list",
  type: "read",
  resource: "legalEntity",
  title: "List legal entities",
  description: "List the legal entities this organization contracts through.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Deel legal entities", { returnAll, limit });

    return await new DeelClient(ctx).requestAllCursor(
      "/legal-entities",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
