import type { Param } from "@w6w/types";

/**
 * Parameters every list action shares: the vendor's generic `filter`, `sort`, `include` and
 * both of its pagination styles.
 *
 * Pagination (guide `pagination`): `page[size]` defaults to 30 and caps at 200;
 * `page[number]` jumps to a page and the answer carries `total_count`; `page[after]` is the
 * preferred cursor style, whose opaque cursor is returned as `nextCursor`. The two styles are
 * mutually exclusive (`keyset_conflict`), so a cursor wins over a page number here.
 */
export function listParams(sortHint: string): Param[] {
  return [
    {
      key: "filter",
      label: "Extra filters",
      type: "json",
      hint: 'JSON object of vendor filters, e.g. `{"project_id": 24}`, ' +
        '`{"name": {"contains": "launch"}}` or a list `{"id": [1, 2, 3]}`. ' +
        "Operators: eq, not_eq, contains, not_contain, gt, gt_eq, lt, lt_eq (not every filter " +
        "takes every operator). An unsupported filter is a 400.",
    },
    { key: "sort", label: "Sort", type: "string", hint: sortHint },
    {
      key: "include",
      label: "Include",
      type: "string",
      hint: "Comma-separated relationships to side-load, e.g. `project,assignee`. They come " +
        "back flattened under `included`. An unsupported name is a 400.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 30,
      hint: "Resources per page. The vendor default is 30 and the maximum is 200.",
    },
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      hint: "1-based page to read (page-based pagination). Ignored when a cursor is used.",
    },
    {
      key: "cursorPaging",
      label: "Cursor pagination",
      type: "boolean",
      hint: "Start cursor pagination from the first page; pass the returned `nextCursor` as " +
        "`Cursor` to continue. Not available on reports or on every sort.",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "The `nextCursor` from a previous call. Opaque: do not build or edit it.",
    },
  ];
}

/** The `include` param of a single-resource read. */
export const includeParam: Param = {
  key: "include",
  label: "Include",
  type: "string",
  hint: "Comma-separated relationships to side-load, e.g. `project,assignee`. They come back " +
    "flattened under `included`.",
};

/** The output keys every list action returns. */
export const listOutput = [
  { key: "items", type: "array" as const, label: "Resources (flattened)" },
  { key: "count", type: "number" as const, label: "Resources on this page" },
  { key: "totalCount", type: "number" as const, label: "Total resources (page-based only)" },
  { key: "totalPages", type: "number" as const, label: "Total pages (page-based only)" },
  { key: "currentPage", type: "number" as const, label: "Current page (page-based only)" },
  { key: "pageSize", type: "number" as const, label: "Page size" },
  { key: "hasMore", type: "boolean" as const, label: "Another page exists" },
  { key: "nextCursor", type: "string" as const, label: "Cursor for the next page" },
  { key: "included", type: "array" as const, label: "Side-loaded resources (flattened)" },
];

/** Output keys of a single flattened resource; the rest are the resource's own attributes. */
export const resourceOutput = (label: string) => [
  { key: "id", type: "string" as const, label: `${label} ID` },
  { key: "type", type: "string" as const, label: "JSON:API type" },
  { key: "relationships", type: "object" as const, label: "Related resource ids" },
  { key: "included", type: "array" as const, label: "Side-loaded resources (flattened)" },
];

export const deleteOutput = [
  { key: "ok", type: "boolean" as const, label: "Deleted" },
  { key: "id", type: "string" as const, label: "ID" },
];
