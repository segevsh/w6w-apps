import type { ActionDefinition } from "@w6w/types";
import { boolToInt, GravityFormsClient, serializeSearch } from "../lib/client.ts";

interface Input {
  formId?: string | number;
  formIds?: Array<string | number>;
  include?: Array<string | number>;
  search?: unknown;
  sortingKey?: string;
  sortingDirection?: "ASC" | "DESC" | "RAND";
  sortingIsNumeric?: boolean;
  pageSize?: number;
  currentPage?: number;
  offset?: number;
  fieldIds?: string;
  labels?: boolean;
}

/**
 * Search entries.
 *
 * Two documented routes, and this action picks between them from the input:
 *
 *   - `GET /gf/v2/forms/[FORM_ID]/entries` when a single Form ID is given
 *   - `GET /gf/v2/entries` otherwise, optionally narrowed by `form_ids`
 *
 * Every list parameter is a PHP array on the wire, which `lib/client.ts`
 * encodes: `paging[page_size]`, `paging[current_page]`, `paging[offset]`,
 * `sorting[key]`, `sorting[direction]`, `sorting[is_numeric]`, and indexed
 * `form_ids[0]` / `include[0]`. `search` is a JSON blob in the query string,
 * exactly as the docs show it.
 *
 * Response: `{ total_count, entries }`.
 */
const entryGetMany: ActionDefinition<Input> = {
  key: "entry-get-many",
  type: "search",
  resource: "entry",
  title: "Get Many Entries",
  description:
    "Search entries across the site or within one form, with filtering, sorting and paging.",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      hint:
        "Restrict to one form (uses the form-scoped route). Leave empty to search across forms " +
        "and use Form IDs instead.",
    },
    {
      key: "formIds",
      label: "Form IDs",
      type: "multiselect",
      hint: "Sent as `form_ids`. Ignored when a single Form ID is set above.",
    },
    {
      key: "include",
      label: "Entry IDs",
      type: "multiselect",
      hint: "Sent as `include` — restricts the response to these entry IDs.",
    },
    {
      key: "search",
      label: "Search",
      type: "json",
      hint: 'Search arguments, e.g. {"status":"active","mode":"all","field_filters":' +
        '[{"key":"2","value":"test","operator":"contains"}]}. `status` defaults to "active". ' +
        "Use Get Form Field Filters for the keys and operators a form accepts.",
    },
    {
      key: "sortingKey",
      label: "Sort By",
      type: "string",
      hint: "Database field to sort by. Defaults to the entry `id`.",
    },
    {
      key: "sortingDirection",
      label: "Sort Direction",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
        { value: "RAND", label: "Random" },
      ],
      default: "DESC",
    },
    {
      key: "sortingIsNumeric",
      label: "Sort Numerically",
      type: "boolean",
      hint: "Treat the sort key as a number rather than a string.",
    },
    { key: "pageSize", label: "Page Size", type: "number", hint: "`paging[page_size]`." },
    {
      key: "currentPage",
      label: "Current Page",
      type: "number",
      hint: "`paging[current_page]` — 1-based.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint: "`paging[offset]` — zero-based record number to start from.",
    },
    {
      key: "fieldIds",
      label: "Field IDs",
      type: "string",
      hint: "Comma-separated list of fields to include in each entry (`_field_ids`).",
    },
    {
      key: "labels",
      label: "Include Field Labels",
      type: "boolean",
      hint: "Adds a `_labels` map to each entry (`_labels=1`).",
    },
  ],
  output: [
    { key: "total_count", type: "number", label: "Count of all matching entries" },
    { key: "entries", type: "array", label: "Matching entry objects" },
  ],

  execute(input, ctx) {
    const client = GravityFormsClient.fromConnection(ctx);
    const scoped = input.formId !== undefined && input.formId !== null && input.formId !== "";
    const path = scoped ? `/forms/${encodeURIComponent(String(input.formId))}/entries` : "/entries";

    return client.request(path, {
      query: {
        form_ids: scoped ? undefined : input.formIds,
        include: input.include,
        search: serializeSearch(input.search),
        sorting: {
          key: input.sortingKey,
          direction: input.sortingDirection,
          is_numeric: input.sortingIsNumeric === undefined
            ? undefined
            : String(input.sortingIsNumeric),
        },
        paging: {
          page_size: input.pageSize,
          current_page: input.currentPage,
          offset: input.offset,
        },
        _field_ids: input.fieldIds,
        _labels: boolToInt(input.labels),
      },
    });
  },
};

export default entryGetMany;
