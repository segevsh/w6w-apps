import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, MeilisearchClient, resolveIndex } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `POST /indexes/{indexUid}/search` — verified against Meilisearch's OpenAPI
 * document (`search_with_post`).
 *
 * **POST, not GET.** Meilisearch offers both, and the GET form takes the same
 * search as a query string — which caps how long a filter can be and forces
 * every array parameter through comma-joining. The POST form takes JSON and has
 * no such limit, so it is the one this app uses.
 *
 * **A filter needs the attribute to be filterable first.** `filterableAttributes`
 * is an index setting; filtering on an attribute that is not in it fails with
 * `code: "invalid_search_filter"` rather than returning nothing. Same for
 * sorting and `sortableAttributes`. `settings-update` is where that is
 * configured, and it is a task like every other write, so it is not instant.
 *
 * **`estimatedTotalHits` is an estimate.** By default Meilisearch does not
 * count every match — it stops once it has enough to answer. Asking for an
 * exact count switches the response to page-based pagination, where the field
 * is `totalHits` instead, and is slower on a large index. That is the trade the
 * Count Every Match parameter makes explicit.
 *
 * **On the field names, which the spec gets wrong.** The document declares this
 * endpoint's body properties in snake_case — `attributes_to_retrieve`,
 * `hits_per_page`, `matching_strategy` — while declaring the *same fields* as
 * camelCase query parameters on the GET form of search two paths away
 * (`attributesToRetrieve`, `hitsPerPage`, `matchingStrategy`). Both spellings
 * cannot be right. The snake_case names are the Rust struct fields the
 * generator saw before serialization renamed them; the camelCase ones are
 * hand-written and match Meilisearch's own documentation. This app sends
 * camelCase.
 */
const action: ActionDefinition = {
  key: "search",
  type: "read",
  resource: "document",
  title: "Search",
  description: "Search an index, with optional filters, sorting and facets.",
  params: [
    INDEX_PARAM,
    {
      key: "q",
      label: "Query",
      type: "string",
      default: "",
      hint: "Blank returns documents in index order — a placeholder search.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      default: "",
      placeholder: "genres = horror AND rating > 8",
      hint: "Meilisearch's filter syntax. The attributes used must be in the index's " +
        "`filterableAttributes` setting first.",
    },
    {
      key: "sort",
      label: "Sort By",
      type: "string",
      default: "",
      placeholder: "rating:desc, year:asc",
      hint: "Comma-separated `attribute:asc|desc`. Requires `sortableAttributes`.",
    },
    {
      key: "attributesToRetrieve",
      label: "Fields To Return",
      type: "string",
      default: "",
      hint: "Comma-separated. Blank returns the whole document.",
    },
    {
      key: "attributesToHighlight",
      label: "Fields To Highlight",
      type: "string",
      default: "",
      hint: "Comma-separated. Highlighted copies arrive under `_formatted`.",
    },
    {
      key: "facets",
      label: "Facets",
      type: "string",
      default: "",
      hint: "Comma-separated attributes to count. They must be filterable.",
    },
    { key: "limit", label: "Limit", type: "number", default: 20 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "showTotalHits",
      label: "Count Every Match",
      type: "boolean",
      default: false,
      hint: "By default the total is an ESTIMATE — Meilisearch stops counting once it has " +
        "enough. This makes it exact, and slower on a large index.",
    },
    {
      key: "matchingStrategy",
      label: "Matching Strategy",
      type: "select",
      default: "last",
      options: [
        { value: "last", label: "Last — drop trailing words until there are results" },
        { value: "all", label: "All — every word must match" },
        { value: "frequency", label: "Frequency — drop the most common words first" },
      ],
    },
    {
      key: "extra",
      label: "Additional Search Parameters",
      type: "json",
      default: "",
      placeholder: '{"cropLength":40,"hybrid":{"embedder":"default"}}',
      hint: "Merged into the request body for parameters this form does not name.",
    },
  ],
  output: [
    { key: "hits", type: "array", label: "Matching documents" },
    { key: "query", type: "string", label: "The query as searched" },
    { key: "processingTimeMs", type: "number", label: "Processing time (ms)" },
    {
      key: "estimatedTotalHits",
      type: "number",
      label: "Estimated matches — an estimate unless Count Every Match is on",
    },
    { key: "totalHits", type: "number", label: "Exact matches, when counted" },
    { key: "facetDistribution", type: "object", label: "Facet counts" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = resolveIndex(ctx.connection, p.indexUid);

    const extra = json(p.extra, "extra");
    if (extra !== undefined && (typeof extra !== "object" || Array.isArray(extra))) {
      throw new Error("`extra` must be a JSON object of search parameters");
    }

    const limit = Number(p.limit ?? 20);
    const offset = Number(p.offset ?? 0);
    const body: Record<string, unknown> = {
      ...compact({
        q: p.q,
        filter: p.filter,
        sort: csv(p.sort),
        attributesToRetrieve: csv(p.attributesToRetrieve),
        attributesToHighlight: csv(p.attributesToHighlight),
        facets: csv(p.facets),
        matchingStrategy: p.matchingStrategy,
      }),
    };

    if (p.showTotalHits === true) {
      // Page-based paging is what makes Meilisearch count exhaustively and
      // report `totalHits`; offset-based paging reports `estimatedTotalHits`.
      body.hitsPerPage = limit;
      body.page = Math.floor(offset / Math.max(1, limit)) + 1;
    } else {
      // 0 is a meaningful offset, so neither of these goes through `compact`.
      body.limit = limit;
      body.offset = offset;
    }
    Object.assign(body, (extra as Record<string, unknown>) ?? {});

    ctx.log("info", "searching Meilisearch", { index, exact: p.showTotalHits === true });

    return await new MeilisearchClient(ctx).request(
      `/indexes/${encodeURIComponent(index)}/search`,
      { method: "POST", body },
    );
  },
};

export default action;
