import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, compact, json } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `POST /1/indexes/{indexName}/deleteByQuery` — verified against Algolia's
 * OpenAPI document (`deleteBy`; ACL **`deleteIndex`**, not `deleteObject` — a
 * key that can delete records one at a time may still be refused here).
 *
 * Note what the schema's body does **not** contain: there is no `query`
 * property. Algolia deletes by *filters* — `filters`, `facetFilters`,
 * `numericFilters`, `tagFilters` and the geo ones — deliberately, because
 * deleting by a full-text query would be dangerously fuzzy. Passing a search
 * string here does nothing, so this action does not offer one.
 */
const action: ActionDefinition = {
  key: "objects-delete-by",
  type: "perform",
  resource: "object",
  title: "Delete records by filter",
  description: "Delete every record matching a filter. Filters only — not a text query.",
  // Deleting an already-deleted set is a no-op; the end state is the same.
  idempotent: true,
  params: [
    INDEX_PARAM,
    {
      key: "filters",
      label: "Filters",
      type: "string",
      default: "",
      placeholder: "status:archived AND updatedAt < 1700000000",
      hint: "Algolia's filter syntax. At least one filter of some kind is required.",
    },
    { key: "facetFilters", label: "Facet Filters", type: "json", default: "" },
    { key: "numericFilters", label: "Numeric Filters", type: "json", default: "" },
    { key: "tagFilters", label: "Tag Filters", type: "json", default: "" },
  ],
  output: [
    { key: "taskID", type: "number", label: "Task ID — pass to Get a task" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");

    const body = compact({
      filters: p.filters,
      facetFilters: json(p.facetFilters, "facetFilters"),
      numericFilters: json(p.numericFilters, "numericFilters"),
      tagFilters: json(p.tagFilters, "tagFilters"),
    });
    if (Object.keys(body).length === 0) {
      // An empty body would ask Algolia to delete by nothing, and guessing what
      // that means is not this action's job.
      throw new Error("set at least one filter — this action deletes by filter, not by query");
    }

    ctx.log("info", "deleting Algolia records by filter", { indexName });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/deleteByQuery`,
      { method: "POST", body },
    );
  },
};

export default action;
