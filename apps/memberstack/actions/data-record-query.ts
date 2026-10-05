import type { ActionDefinition } from "@w6w/types";
import { MemberstackClient } from "../lib/client.ts";
import { asObject, asObjectOrArray, tableKeyParam } from "../lib/params.ts";

/**
 * `POST /v2/data-tables/:tableKey/records/query` with `{ query: { findMany: {...} } }`.
 *
 * Limits from the page: `take` 1–100 (default 100); `skip` max 10000; `skip` and `after`
 * cannot be combined; `include` and `select` cannot be combined; `after` only pages
 * correctly when EVERY request sends `orderBy: { internalOrder: "asc" }`; max include depth 3,
 * 10 includes, 50 where conditions. `countOnly` sends `_count: true` and answers
 * `{ data: { _count } }` instead of records.
 *
 * Query reads are rate-limited at 25/s; the API's validation message is surfaced on a 400.
 */
interface Input {
  tableKey: string;
  where?: unknown;
  orderBy?: unknown;
  take?: number;
  skip?: number;
  after?: number;
  include?: unknown;
  select?: unknown;
  countOnly?: boolean;
}

const dataRecordQuery: ActionDefinition<Input> = {
  key: "data-record-query",
  type: "search",
  resource: "data-record",
  title: "Query Data Records",
  description: "Filter, sort and page through a Data Table's records (Prisma-style findMany).",
  params: [
    tableKeyParam,
    {
      key: "where",
      label: "Where",
      type: "json",
      placeholder: '{"inStock": true, "price": {"gte": 20}}',
      hint: "Operators: equals, not, in, notIn, lt, lte, gt, gte, contains, startsWith, " +
        "endsWith; combine with AND / OR / NOT.",
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "json",
      placeholder: '{"internalOrder": "asc"}',
      hint: 'Required as {"internalOrder":"asc"} on every page when paging with a cursor.',
    },
    {
      key: "take",
      label: "Take",
      type: "number",
      validation: { min: 1, max: 100, integer: true },
      hint: "Records per page, 1–100 (default 100).",
    },
    {
      key: "after",
      label: "After cursor",
      type: "number",
      hint: "The previous page's endCursor. Cannot be used with skip.",
    },
    {
      key: "skip",
      label: "Skip",
      type: "number",
      validation: { min: 0, max: 10000, integer: true },
      hint: "Offset pagination (max 10000). Cannot be used with after.",
    },
    { key: "include", label: "Include", type: "json", hint: "Cannot be combined with select." },
    { key: "select", label: "Select", type: "json", hint: "Cannot be combined with include." },
    {
      key: "countOnly",
      label: "Count only",
      type: "boolean",
      default: false,
      hint: "Return just the number of matching records.",
    },
  ],
  output: [
    { key: "records", type: "array", label: "Records" },
    { key: "hasMore", type: "boolean", label: "More pages exist" },
    { key: "endCursor", type: "number", label: "Cursor for the next page" },
    { key: "count", type: "number", label: "Matching count (countOnly)" },
  ],

  async execute(input, ctx) {
    const findMany: Record<string, unknown> = {};
    const where = asObject(input.where, "where");
    const include = asObject(input.include, "include");
    const select = asObject(input.select, "select");
    if (include && select) throw new Error("include and select cannot be used together");
    if (input.after !== undefined && input.after !== null && input.skip) {
      throw new Error("skip and after cannot be used together");
    }
    if (where) findMany.where = where;
    const orderBy = asObjectOrArray(input.orderBy, "orderBy");
    if (orderBy) findMany.orderBy = orderBy;
    if (include) findMany.include = include;
    if (select) findMany.select = select;
    if (input.take !== undefined && input.take !== null) findMany.take = input.take;
    if (input.skip) findMany.skip = input.skip;
    if (input.after !== undefined && input.after !== null) findMany.after = input.after;
    if (input.countOnly) findMany._count = true;

    const body = await new MemberstackClient(ctx).json<{
      data?: {
        records?: unknown[];
        pagination?: { hasMore?: boolean; endCursor?: number };
        _count?: number;
      };
    }>(`/v2/data-tables/${encodeURIComponent(input.tableKey)}/records/query`, {
      method: "POST",
      body: { query: { findMany } },
    });

    const data = body?.data;
    if (input.countOnly) return { records: [], hasMore: false, count: data?._count ?? 0 };
    return {
      records: data?.records ?? [],
      hasMore: data?.pagination?.hasMore ?? false,
      endCursor: data?.pagination?.endCursor,
    };
  },
};

export default dataRecordQuery;
