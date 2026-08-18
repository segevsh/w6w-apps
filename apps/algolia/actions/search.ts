import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, compact, csv, json } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `POST /1/indexes/{indexName}/query` — verified against Algolia's OpenAPI
 * document (`searchSingleIndex`; ACL `search`, and marked
 * `x-use-read-transporter`, so it goes to the DSN host).
 *
 * The search body has dozens of optional parameters (typo tolerance, faceting,
 * geo, personalisation, ranking overrides). The common ones are fields here;
 * everything else goes through `extraParams`, which is merged over them —
 * modelling all of Algolia's query DSL as form fields would be a worse copy of
 * their documentation.
 */
const action: ActionDefinition = {
  key: "search",
  type: "search",
  resource: "index",
  title: "Search an index",
  description: "Search one index and return matching hits.",
  params: [
    INDEX_PARAM,
    {
      key: "query",
      label: "Query",
      type: "string",
      default: "",
      hint: "Blank matches everything.",
    },
    {
      key: "hitsPerPage",
      label: "Hits Per Page",
      type: "number",
      default: 20,
      hint: "This endpoint returns at most 1,000 hits in total — use Browse to export more.",
    },
    { key: "page", label: "Page", type: "number", default: null, hint: "Zero-based." },
    {
      key: "filters",
      label: "Filters",
      type: "string",
      default: "",
      placeholder: "category:shoes AND price < 100",
      hint: "Algolia's filter syntax.",
    },
    {
      key: "facetFilters",
      label: "Facet Filters",
      type: "json",
      default: "",
      placeholder: '[["color:red","color:blue"],"size:M"]',
      hint: "Nested arrays are OR within, AND between.",
    },
    {
      key: "facets",
      label: "Facets",
      type: "string",
      default: "",
      hint: "Comma-separated facet names to return counts for. `*` for all.",
    },
    {
      key: "attributesToRetrieve",
      label: "Attributes To Retrieve",
      type: "string",
      default: "",
      hint: "Comma-separated. Leave blank for all.",
    },
    {
      key: "extraParams",
      label: "Extra Search Parameters",
      type: "json",
      default: "",
      hint: "Any other Algolia search parameter, merged over the fields above.",
    },
  ],
  output: [
    { key: "hits", type: "array", label: "Hits" },
    { key: "nbHits", type: "number", label: "Total matches" },
    { key: "page", type: "number", label: "Page" },
    { key: "nbPages", type: "number", label: "Pages" },
    { key: "hitsPerPage", type: "number", label: "Hits per page" },
    { key: "facets", type: "object", label: "Facet counts" },
    { key: "processingTimeMS", type: "number", label: "Processing time (ms)" },
    { key: "query", type: "string", label: "Query as parsed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");

    const extra = (json(p.extraParams, "extraParams") ?? {}) as Record<string, unknown>;
    const body = {
      ...compact({
        query: p.query,
        hitsPerPage: typeof p.hitsPerPage === "number" ? p.hitsPerPage : undefined,
        page: typeof p.page === "number" ? p.page : undefined,
        filters: p.filters,
        facetFilters: json(p.facetFilters, "facetFilters"),
        facets: csv(p.facets),
        attributesToRetrieve: csv(p.attributesToRetrieve),
      }),
      ...extra,
    };

    ctx.log("info", "searching Algolia index", { indexName });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/query`,
      { method: "POST", body, read: true },
    );
  },
};

export default action;
