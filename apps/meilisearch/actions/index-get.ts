import type { ActionDefinition } from "@w6w/types";
import { MeilisearchClient, resolveIndex } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `GET /indexes/{indexUid}` — verified against Meilisearch's OpenAPI document
 * (`get_index`).
 *
 * The field worth reading is `primaryKey`: it is `null` until the first
 * documents arrive, after which it is fixed. That is how you find out what
 * Meilisearch guessed if you did not name one.
 */
const action: ActionDefinition = {
  key: "index-get",
  type: "read",
  resource: "index",
  title: "Get an index",
  description: "Retrieve one index and its primary key.",
  params: [INDEX_PARAM],
  output: [
    { key: "uid", type: "string", label: "Index UID" },
    { key: "primaryKey", type: "string", label: "Primary key — null until the first documents" },
    { key: "createdAt", type: "string", label: "Created" },
    { key: "updatedAt", type: "string", label: "Updated" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = resolveIndex(ctx.connection, p.indexUid);

    ctx.log("info", "getting a Meilisearch index", { index });

    return await new MeilisearchClient(ctx).request(`/indexes/${encodeURIComponent(index)}`);
  },
};

export default action;
