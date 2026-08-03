import type { ActionDefinition } from "@w6w/types";
import { CloseClient, compact, type SearchResponse } from "../lib/client.ts";

interface Input {
  query: Record<string, unknown>;
  limit?: number;
  cursor?: string;
  fields?: Record<string, unknown> | null;
  sort?: unknown[] | null;
  includeCounts?: boolean;
  resultsLimit?: number;
}

/**
 * `POST /data/search/` — the Advanced Filtering API.
 *
 * ## Why this action exists at all
 *
 * `GET /lead/` documents only `_limit`, `_skip` and `_fields` — there is no
 * documented condition filter on it. Close's Leads page redirects that job here:
 * "To easily find Leads that match specific conditions, use the Advanced
 * Filtering API." So without this action the app could enumerate leads but not
 * search them.
 *
 * ## Two things worth knowing before using it
 *
 * **It is not in Close's OpenAPI document.** That document lists 158 paths and
 * `/data/search/` is not among them; it is documented in prose at
 * <https://developer.close.com/api/resources/advanced-filtering> instead, which
 * states the endpoint verbatim as "a POST request to `/api/v1/data/search/`".
 * Both were checked on 2026-08-03. The prose docs are authoritative here — Close
 * labels its own OpenAPI spec experimental and incomplete.
 *
 * **It is cursor-paginated, not offset-paginated.** The response envelope is
 * `{ data, cursor, count? }` — a `cursor` to pass back, not the `has_more` flag
 * the offset endpoints return. Hence `SearchResponse` rather than `CloseList`.
 *
 * ## Why `query` is a raw JSON param
 *
 * The filter is a recursive query DSL: `and` / `or` / `not` nodes wrapping
 * `object_type`, `field_condition` and `has_related` leaves, where a
 * `field_condition` names a `regular_field` or `custom_field` and pairs it with
 * one of several condition shapes (`text`, `number_range`, `boolean`, `exists`,
 * `term`, `reference`). That is a tree, and no flat `Param[]` form can express a
 * tree faithfully. Offering three flattened dropdowns would only be able to
 * build the trivial queries while silently making the real ones impossible, so
 * the DSL is passed through verbatim and documented instead of half-modelled.
 *
 * By default the response returns matched objects' ids and `__object_type` only;
 * name fields via `_fields` to get more back in the same round trip.
 */
const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "lead",
  title: "Search",
  description:
    "Find Leads or Contacts matching arbitrary conditions via Close's Advanced Filtering API. " +
    "Cursor-paginated: pass the previous response's `cursor` back to get the next page.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "json",
      required: true,
      hint: 'The Advanced Filtering query tree. e.g. `{"type": "and", "queries": [' +
        '{"type": "object_type", "object_type": "lead"}, {"type": "field_condition", ' +
        '"field": {"type": "regular_field", "object_type": "lead", "field_name": "name"}, ' +
        '"condition": {"type": "text", "mode": "full_words", "value": "Bluth"}}]}`.',
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Results per page (`_limit`), sent in the request body rather than the query string.",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "The previous response's `cursor`. Leave empty for the first page.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      hint:
        'Which fields to return per object type, e.g. `{"lead": ["id", "name", "status_label"]}`. ' +
        "Omit and Close returns ids and `__object_type` only.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "json",
      hint: "Array of sort clauses, as documented on the Advanced Filtering page.",
    },
    {
      key: "includeCounts",
      label: "Include counts",
      type: "boolean",
      hint: "Adds a `count` object to the response. Slower — request it on the first page only.",
    },
    {
      key: "resultsLimit",
      label: "Results limit",
      type: "number",
      hint:
        "Caps the OVERALL result set, separate from per-page pagination. Set it to 0 alongside " +
        "`includeCounts` to ask only how many matches exist, without fetching any.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Matched objects" },
    { key: "cursor", type: "string", label: "Cursor for the next page, or null on the last page" },
  ],

  execute(input, ctx) {
    return new CloseClient(ctx).request<SearchResponse>("/data/search/", {
      method: "POST",
      body: compact({
        query: input.query,
        _limit: input.limit,
        cursor: input.cursor,
        _fields: input.fields ?? undefined,
        sort: input.sort ?? undefined,
        include_counts: input.includeCounts,
        results_limit: input.resultsLimit,
      }),
    });
  },
};

export default search;
