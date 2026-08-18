import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `POST /1/indexes/{indexName}/clear` — verified against Algolia's OpenAPI
 * document (`clearObjects`; ACL `deleteIndex`).
 *
 * Empties the index of records but **keeps the index, its settings, synonyms
 * and rules** — which is the difference from `index-delete`, and the reason a
 * full re-index uses this one.
 */
const action: ActionDefinition = {
  key: "index-clear",
  type: "perform",
  resource: "index",
  title: "Clear an index",
  description: "Delete every record in an index, keeping its settings, synonyms and rules.",
  idempotent: true,
  params: [INDEX_PARAM],
  output: [
    { key: "taskID", type: "number", label: "Task ID — pass to Get a task" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");

    ctx.log("info", "clearing Algolia index", { indexName });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/clear`,
      { method: "POST" },
    );
  },
};

export default action;
