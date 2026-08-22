import type { ActionDefinition } from "@w6w/types";
import { compact, csv, query, TypesenseClient } from "../lib/client.ts";

/**
 * `GET /collections/{name}/documents/search` — the reason Typesense exists.
 *
 * ## Typesense answers a shorter question when the answer is thin
 *
 * Two defaults do this, and neither is visible in the response:
 *
 * - **`drop_tokens_threshold`, default 10.** Fewer than ten results, and
 *   Typesense starts dropping words from the query — least-matching first —
 *   until it has enough. A search for "red waterproof hiking boots" can come
 *   back with every boot, and nothing in the hits says which words matched.
 * - **`typo_tokens_threshold`, default 100.** Fewer than a hundred results,
 *   and it starts tolerating more typos.
 *
 * For a shop's search box that behaviour is right: an empty page is worse than
 * an approximate one. For a workflow that acts on the result — deduplicating
 * records, matching an incoming order to a product — it is a silent
 * correctness problem, because the hit that comes back is not what was asked
 * for and carries no mark saying so.
 *
 * This action exposes both thresholds, defaults them to Typesense's own, and
 * reports whether the result *could* have been widened by either. `strict`
 * sets both to zero in one switch, which is what a matching workflow wants.
 *
 * ## `query_by` is required and must be string fields
 *
 * Typesense searches only the fields named. Omitting one that matters produces
 * a confident empty result rather than an error, and naming a numeric field is
 * an error that reads as though the field is missing.
 *
 * ## `q: "*"` means everything
 *
 * With `filter_by`, that is how you fetch a filtered slice rather than a
 * search — the closest Typesense has to a database query.
 */
const action: ActionDefinition = {
  key: "document-search",
  type: "search",
  resource: "document",
  title: "Search a collection",
  description:
    "Search documents. Typesense QUIETLY WIDENS a thin result — dropping query words below 10 " +
    "hits and allowing more typos below 100 — which is right for a search box and a correctness " +
    "problem for a workflow that acts on the answer. `strict` turns both off.",
  params: [
    {
      key: "collection",
      label: "Collection",
      type: "string",
      required: true,
      default: "",
      hint: "Case-sensitive. An alias name works here.",
    },
    {
      key: "q",
      label: "Query",
      type: "string",
      required: true,
      default: "",
      hint: "`*` returns everything, which with a filter is how to fetch a slice rather than " +
        "search.",
    },
    {
      key: "queryBy",
      label: "Query by",
      type: "string",
      required: true,
      default: "",
      placeholder: "name, description",
      hint: "Comma-separated STRING fields. Only these are searched — omitting one gives a " +
        "confident empty result, and naming a numeric field is an error that reads as a missing " +
        "field.",
    },
    {
      key: "filterBy",
      label: "Filter by",
      type: "string",
      default: "",
      placeholder: "in_stock:true && price:<100",
      hint: "Typesense's filter syntax. Exact, unlike the query.",
    },
    { key: "sortBy", label: "Sort by", type: "string", default: "", placeholder: "price:asc" },
    {
      key: "facetBy",
      label: "Facet by",
      type: "string",
      default: "",
      hint: "Fields must be declared `facet: true` in the schema.",
    },
    { key: "perPage", label: "Results per page", type: "number", default: 10 },
    { key: "page", label: "Page", type: "number", default: 1 },
    {
      key: "strict",
      label: "Strict matching",
      type: "boolean",
      default: false,
      hint: "Sets both widening thresholds to 0, so a hit matched every word as typed. The right " +
        "setting when a workflow acts on the result.",
    },
    {
      key: "numTypos",
      label: "Typos tolerated",
      type: "number",
      default: 2,
      advanced: true,
      hint: "0, 1 or 2. Typesense's default is 2.",
    },
    {
      key: "includeFields",
      label: "Include fields",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated. Smaller responses, and the way to keep a field out of a run log.",
    },
  ],
  output: [
    { key: "hits", type: "array", label: "The documents, with their scores" },
    { key: "documents", type: "array", label: "Just the documents" },
    { key: "found", type: "number", label: "How many matched in total" },
    { key: "returned", type: "number", label: "How many came back on this page" },
    { key: "outOf", type: "number", label: "How many documents were searched" },
    { key: "facets", type: "array", label: "Facet counts, if any were requested" },
    { key: "searchTimeMs", type: "number", label: "What Typesense spent" },
    { key: "mayHaveBeenWidened", type: "boolean", label: "Thin result, widening left enabled" },
    { key: "strict", type: "boolean", label: "Whether widening was turned off" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");
    const q = String(p.q ?? "").trim();
    if (!q) {
      throw new Error(
        "`q` is required — use `*` to match everything, which with a `filterBy` is how to fetch " +
          "a filtered slice rather than search for text",
      );
    }
    const queryBy = csv(p.queryBy);
    if (!queryBy?.length) {
      throw new Error(
        "`queryBy` must name at least one string field. Typesense searches only the fields " +
          "named, so omitting the one that matters returns an empty result with no error",
      );
    }

    const strict = p.strict === true;
    const perPage = Math.max(1, Math.min(250, Number(p.perPage ?? 10)));

    const result = await new TypesenseClient(ctx).request<{
      hits?: Array<{ document?: Record<string, unknown>; text_match?: number }>;
      found?: number;
      out_of?: number;
      search_time_ms?: number;
      facet_counts?: unknown[];
    }>(`/collections/${encodeURIComponent(collection)}/documents/search`, {
      query: query(compact({
        q,
        query_by: queryBy.join(","),
        filter_by: String(p.filterBy ?? "").trim(),
        sort_by: String(p.sortBy ?? "").trim(),
        facet_by: csv(p.facetBy)?.join(","),
        include_fields: csv(p.includeFields)?.join(","),
        per_page: perPage,
        page: Math.max(1, Number(p.page ?? 1)),
        num_typos: strict ? 0 : Math.max(0, Math.min(2, Number(p.numTypos ?? 2))),
        // The two settings that quietly answer a different question.
        drop_tokens_threshold: strict ? 0 : undefined,
        typo_tokens_threshold: strict ? 0 : undefined,
      })),
    });

    const hits = result?.hits ?? [];
    const found = Number(result?.found ?? hits.length);

    // Below Typesense's own thresholds, a non-strict search may have widened.
    const mayHaveBeenWidened = !strict && found < 10;
    if (mayHaveBeenWidened) {
      ctx.log(
        "info",
        "this search returned fewer than 10 results, which is where Typesense starts dropping " +
          "query words to find more — the hits may match fewer words than were asked for, and " +
          "nothing in them says so. `strict` turns that off",
        { collection, found },
      );
    }

    // Counts and timings. The documents are the customer's data.
    ctx.log("info", "searched a Typesense collection", {
      collection,
      found,
      returned: hits.length,
    });

    return {
      hits,
      documents: hits.map((hit) => hit?.document),
      found,
      returned: hits.length,
      outOf: result?.out_of,
      facets: result?.facet_counts ?? [],
      searchTimeMs: result?.search_time_ms,
      mayHaveBeenWidened,
      strict,
    };
  },
};

export default action;
