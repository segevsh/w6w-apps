import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, type ListEnvelope, SmartSuiteClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  offset?: number;
  limit?: number;
  all?: boolean;
  sort?: unknown;
  filter?: unknown;
  hydrated?: boolean;
}

/**
 * `POST /applications/{tableId}/records/list/` — list (and filter) records.
 *
 * Paging is the envelope's own arithmetic, not a cursor: the response is
 * `{ total, offset, limit, items }`, so the next page is
 * `offset + limit`. `limit` maxes at 1000 and defaults to 100.
 *
 * `sort` and `filter` are passed through as raw JSON because SmartSuite's
 * filter grammar is an arbitrary nested comparison tree (`AND`/`OR` over
 * per-field operators), and each table's field slugs are its own. `hydrated:
 * true` asks SmartSuite to resolve id-type fields to their text labels rather
 * than returning bare ids.
 *
 * `all: true` includes deleted records.
 */
const listRecords: ActionDefinition<Input, ListEnvelope> = {
  key: "list-records",
  type: "search",
  resource: "record",
  title: "List Records",
  description:
    "List or filter a SmartSuite Table's records with offset paging (POST /applications/{tableId}/records/list/).",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      hint: "The `id` of the Table to read.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true },
      hint: "Number of records to skip. Pair with `limit` to walk the result set.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Maximum records to return (default 100, maximum 1000).",
    },
    {
      key: "all",
      label: "Include deleted",
      type: "boolean",
      hint: "Include records that have been deleted.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "json",
      hint: 'SmartSuite sort array, e.g. [{ "field": "slug", "direction": "asc" }].',
    },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint: "SmartSuite filter tree, keyed by this table's field slugs.",
    },
    {
      key: "hydrated",
      label: "Hydrated",
      type: "boolean",
      hint: "Resolve id-type fields to their text labels instead of returning only ids.",
    },
  ],
  output: [
    { key: "total", type: "number", label: "Total matching records" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "items", type: "array", label: "Records" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.sort !== undefined) body.sort = input.sort;
    if (input.filter !== undefined) body.filter = input.filter;
    if (input.hydrated !== undefined) body.hydrated = input.hydrated;

    return new SmartSuiteClient(ctx).request<ListEnvelope>(
      `applications/${encodeSegment(input.tableId)}/records/list/`,
      {
        method: "POST",
        query: {
          offset: input.offset,
          limit: input.limit ?? 100,
          all: input.all,
        },
        body,
      },
    );
  },
};

export default listRecords;
