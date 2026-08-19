import type { ActionDefinition } from "@w6w/types";
import type { PageInfo } from "../lib/client.ts";
import { assertWhere, csv, NocoDBClient, query } from "../lib/client.ts";

/**
 * `GET /api/v2/tables/{tableId}/records` — read rows.
 *
 * ## The filter syntax tolerates no spaces, and failing silently is the point
 *
 * `(field,eq,value)~and(other,gt,3)`. NocoDB's documentation says not to put
 * spaces between the parts of a condition, and the reason it matters is what
 * happens when you do: the request **succeeds** and returns nothing, because
 * the field name now ends in a space and matches no column. A workflow reads
 * "no records matched" and carries on.
 *
 * `assertWhere` catches that before the request, along with a `where` that
 * looks like SQL.
 *
 * ## A view's filters are applied *underneath* yours
 *
 * With `viewId`, NocoDB's own words: the conditions here "will be applied over
 * the filtering configuration defined in the view". So a `where` against a
 * filtered view returns the intersection — not the rows the filter names. A
 * workflow that wants everything must not pass a view.
 *
 * ## Sixty requests a minute makes paging expensive
 *
 * NocoDB allows 60 requests a minute per caller, and pages default to 25
 * records. Walking a ten-thousand-row table at that size takes four hundred
 * requests: six and a half minutes of doing nothing else. This action defaults
 * to a page of 200 and returns the rate-limit headroom it saw, because here —
 * unlike Storyblok — a bigger page is unambiguously better.
 */
const action: ActionDefinition = {
  key: "record-list",
  type: "search",
  resource: "record",
  title: "List records",
  description:
    "Read rows, filtered and sorted. NocoDB's `where` syntax takes NO SPACES between the parts " +
    "of a condition — with them the request succeeds and returns nothing — so this checks first. " +
    "A `viewId` applies your filter ON TOP of the view's own.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `table-list`. NocoDB checks this before the credential, so a 404 here is " +
        "always the id.",
    },
    {
      key: "where",
      label: "Filter",
      type: "string",
      default: "",
      placeholder: "(Status,eq,Active)~and(Amount,gt,100)",
      hint: "NocoDB's condition syntax. NO SPACES between field, operator and value — with them " +
        "the filter matches nothing and returns 200.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      default: "",
      placeholder: "-CreatedAt, Name",
      hint: "Comma-separated field names; a leading `-` sorts descending.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "",
      hint: "Comma-separated. Fewer fields is a smaller response and, on a table with " +
        "attachments, a much smaller one.",
    },
    {
      key: "viewId",
      label: "View ID",
      type: "string",
      default: "",
      hint: "Scopes to a view's own filters and sorts — and any `where` here is applied ON TOP " +
        "of them, not instead of them.",
    },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      default: 200,
      hint: "NocoDB allows only 60 requests a minute, so a larger page is straightforwardly " +
        "better here.",
    },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "records", type: "array", label: "The rows" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "totalRows", type: "number", label: "How many match in all" },
    { key: "isLastPage", type: "boolean", label: "Whether this is the end" },
    { key: "nextOffset", type: "number", label: "Where the next page starts" },
    { key: "ids", type: "array", label: "The records' primary keys" },
    { key: "requestsRemaining", type: "number", label: "Left in this minute's budget" },
    { key: "viewApplied", type: "boolean", label: "Whether a view's filters also applied" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");

    const where = String(p.where ?? "").trim();
    assertWhere(where);

    const viewId = String(p.viewId ?? "").trim();
    if (viewId && where) {
      ctx.log(
        "info",
        "this filter is applied ON TOP of the view's own filters, so the result is the " +
          "intersection rather than the rows the filter names",
        { tableId, viewId },
      );
    }

    const limit = Math.max(1, Math.min(1000, Number(p.limit ?? 200)));
    const offset = Math.max(0, Number(p.offset ?? 0));

    const result = await new NocoDBClient(ctx).full<{
      list?: Array<Record<string, unknown>>;
      pageInfo?: PageInfo;
    }>(`/api/v2/tables/${encodeURIComponent(tableId)}/records`, {
      query: query({
        where,
        sort: csv(p.sort)?.join(","),
        fields: csv(p.fields)?.join(","),
        viewId,
        limit,
        offset,
      }),
    });

    const records = result.data?.list ?? [];
    const pageInfo = result.data?.pageInfo ?? {};

    // Counts and ids. The rows are the customer's data.
    ctx.log("info", "listed NocoDB records", {
      tableId,
      count: records.length,
      totalRows: pageInfo.totalRows,
    });

    return {
      records,
      count: records.length,
      totalRows: pageInfo.totalRows,
      isLastPage: pageInfo.isLastPage === true,
      nextOffset: pageInfo.isLastPage === true ? undefined : offset + records.length,
      ids: records.map((record) => record?.Id ?? record?.id).filter((id) => id !== undefined),
      requestsRemaining: result.rateLimit.remaining,
      viewApplied: Boolean(viewId),
    };
  },
};

export default action;
