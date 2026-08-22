import type { ActionDefinition } from "@w6w/types";
import { MeilisearchClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /indexes` — verified against Meilisearch's OpenAPI document
 * (`list_indexes`).
 *
 * Offset-paged with the `{results, offset, limit, total}` envelope — not the
 * cursor envelope `/tasks` uses.
 */
const action: ActionDefinition = {
  key: "index-list",
  type: "read",
  resource: "index",
  title: "List indexes",
  description: "List the indexes on this instance, with their primary keys.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Meilisearch indexes", { returnAll, limit });

    return await new MeilisearchClient(ctx).requestAll(
      "/indexes",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
