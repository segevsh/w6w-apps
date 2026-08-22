import type { ActionDefinition } from "@w6w/types";
import { compact, MeilisearchClient, resolveIndex } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `POST /indexes/{indexUid}/facet-search` — verified against Meilisearch's
 * OpenAPI document.
 *
 * Searches **within the values of one facet** rather than within documents:
 * "which genres match `hor`" instead of "which films match `horror`". That is
 * what powers a searchable filter list in a UI, and it is a different endpoint
 * rather than a mode of `search` because the answer is a list of facet values
 * with counts.
 *
 * The facet must be in the index's `filterableAttributes`, and the index's
 * `facetSearch` setting must be on. Both are index settings, both are changed
 * by a task, and neither is instant.
 */
const action: ActionDefinition = {
  key: "facet-search",
  type: "read",
  resource: "document",
  title: "Search facet values",
  description: "Find matching values of one facet, with their counts.",
  params: [
    INDEX_PARAM,
    {
      key: "facetName",
      label: "Facet",
      type: "string",
      required: true,
      default: "",
      placeholder: "genres",
      hint: "Must be in the index's `filterableAttributes`.",
    },
    {
      key: "facetQuery",
      label: "Facet Query",
      type: "string",
      default: "",
      hint: "Blank returns the facet's values unfiltered.",
    },
    {
      key: "q",
      label: "Document Query",
      type: "string",
      default: "",
      hint: "Narrows the counts to documents matching this search.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      default: "",
      hint: "Narrows the counts further, in Meilisearch's filter syntax.",
    },
  ],
  output: [
    { key: "facetHits", type: "array", label: "Matching facet values, with counts" },
    { key: "facetQuery", type: "string", label: "The facet query as searched" },
    { key: "processingTimeMs", type: "number", label: "Processing time (ms)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = resolveIndex(ctx.connection, p.indexUid);
    const facetName = String(p.facetName ?? "").trim();
    if (!facetName) throw new Error("`facetName` is required");

    ctx.log("info", "searching Meilisearch facet values", { index, facetName });

    return await new MeilisearchClient(ctx).request(
      `/indexes/${encodeURIComponent(index)}/facet-search`,
      {
        method: "POST",
        body: compact({
          facetName,
          facetQuery: p.facetQuery,
          q: p.q,
          filter: p.filter,
        }),
      },
    );
  },
};

export default action;
