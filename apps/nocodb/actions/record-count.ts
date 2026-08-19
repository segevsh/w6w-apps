import type { ActionDefinition } from "@w6w/types";
import { assertWhere, NocoDBClient, query } from "../lib/client.ts";

/**
 * `GET /api/v2/tables/{tableId}/records/count` — how many rows match, without
 * fetching them.
 *
 * ## One request instead of four hundred
 *
 * With sixty requests a minute and pages of records, counting a table by
 * paging through it is the expensive way to learn a number. This is the cheap
 * way, and it is the right call for the questions that only need the count:
 * did the import land, is the queue empty, has anything changed since.
 *
 * ## It takes the same filter, and the same trap
 *
 * `where` behaves exactly as in `record-list`, including matching nothing when
 * it contains spaces — and here that failure is even quieter, because "0" is a
 * perfectly plausible answer.
 */
const action: ActionDefinition = {
  key: "record-count",
  type: "read",
  resource: "record",
  title: "Count records",
  description:
    "How many rows match, in one request rather than by paging — which matters when the budget " +
    "is 60 requests a minute. The `where` trap is quieter here: a filter with spaces returns " +
    "ZERO, which is a plausible answer.",
  params: [
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
    {
      key: "where",
      label: "Filter",
      type: "string",
      default: "",
      placeholder: "(Status,eq,Active)",
      hint: "NocoDB's condition syntax, with no spaces inside a condition.",
    },
    {
      key: "viewId",
      label: "View ID",
      type: "string",
      default: "",
      hint: "Counts within a view's own filters, with any `where` applied on top.",
    },
  ],
  output: [
    { key: "count", type: "number", label: "How many rows match" },
    { key: "isEmpty", type: "boolean", label: "Whether nothing matched" },
    { key: "where", type: "string", label: "The filter, for the record" },
    { key: "requestsRemaining", type: "number", label: "Left in this minute's budget" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");
    const where = String(p.where ?? "").trim();
    assertWhere(where);

    const result = await new NocoDBClient(ctx).full<{ count?: number }>(
      `/api/v2/tables/${encodeURIComponent(tableId)}/records/count`,
      { query: query({ where, viewId: String(p.viewId ?? "").trim() }) },
    );

    const count = Number(result.data?.count ?? 0);
    if (count === 0 && where) {
      ctx.log(
        "info",
        "nothing matched. With a filter this is worth a second look: a `where` that NocoDB " +
          "cannot parse into a real column returns zero rather than an error",
        { tableId },
      );
    }

    return {
      count,
      isEmpty: count === 0,
      where: where || undefined,
      requestsRemaining: result.rateLimit.remaining,
    };
  },
};

export default action;
