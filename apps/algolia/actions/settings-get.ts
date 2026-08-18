import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `GET /1/indexes/{indexName}/settings` — verified against Algolia's OpenAPI
 * document (`getSettings`; ACL `settings`).
 */
const action: ActionDefinition = {
  key: "settings-get",
  type: "read",
  resource: "index",
  title: "Get index settings",
  description: "Read an index's searchable attributes, ranking, faceting and typo settings.",
  params: [INDEX_PARAM],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");

    ctx.log("info", "getting Algolia index settings", { indexName });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/settings`,
      { read: true },
    );
  },
};

export default action;
