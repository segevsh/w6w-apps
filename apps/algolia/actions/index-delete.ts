import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `DELETE /1/indexes/{indexName}` — verified against Algolia's OpenAPI
 * document (`deleteIndex`; ACL `deleteIndex`).
 *
 * Removes the index **and** its settings, synonyms and rules. `index-clear`
 * is the one that keeps the configuration.
 */
const action: ActionDefinition = {
  key: "index-delete",
  type: "perform",
  resource: "index",
  title: "Delete an index",
  description: "Delete an index along with its settings, synonyms and rules.",
  idempotent: true,
  params: [INDEX_PARAM],
  output: [
    { key: "taskID", type: "number", label: "Task ID — pass to Get a task" },
    { key: "deletedAt", type: "string", label: "Deleted at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");

    ctx.log("info", "deleting Algolia index", { indexName });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}`,
      { method: "DELETE" },
    );
  },
};

export default action;
