import type { ActionDefinition } from "@w6w/types";
import { parseJsonOptional, QuickbaseClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  after: string;
  fieldList?: unknown;
  includeDetails?: boolean;
}

interface Change {
  recordId?: number;
  timestamp?: string;
  changeType?: string;
}

interface Output {
  count?: number;
  changes?: Change[];
  deletesTruncated?: boolean;
}

/**
 * `POST /records/modifiedSince` — what changed in a table since a timestamp.
 *
 * This is the endpoint to reach for when building an incremental sync, and it
 * answers a question `query-records` cannot: it reports **deletions**. A query
 * can only return rows that still exist, so a poll built on `query-records`
 * plus a modified-date filter silently misses every deleted record.
 *
 * `deletesTruncated` is the honest edge: Quickbase caps how far back it retains
 * deletion records, and sets this flag when the answer is incomplete. A sync
 * that sees it true should fall back to a full reconciliation rather than
 * assume it has the whole delta.
 *
 * `after` is an ISO-8601 UTC timestamp.
 */
const recordsModifiedSince: ActionDefinition<Input, Output> = {
  key: "records-modified-since",
  type: "search",
  resource: "record",
  title: "Records Modified Since",
  description:
    "List record changes — including deletions — in a table since a timestamp. The basis for an incremental sync.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    {
      key: "after",
      label: "Changed after",
      type: "datetime",
      required: true,
      hint: "ISO-8601 UTC timestamp, e.g. 2026-08-01T00:00:00Z.",
    },
    {
      key: "fieldList",
      label: "Field IDs to watch",
      type: "json",
      hint: "Array of field IDs. Empty watches every field.",
    },
    {
      key: "includeDetails",
      label: "Include change details",
      type: "boolean",
      hint: "Return per-change detail rather than record IDs alone.",
    },
  ],
  output: [
    { key: "count", type: "number", label: "Number of changes" },
    { key: "changes", type: "array", label: "Changes" },
    { key: "deletesTruncated", type: "boolean", label: "Deletion history was truncated" },
  ],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<Output>("records/modifiedSince", {
      method: "POST",
      body: {
        from: input.tableId,
        after: input.after,
        fieldList: parseJsonOptional<number[]>(input.fieldList, "Field IDs to watch"),
        includeDetails: input.includeDetails,
      },
    });
  },
};

export default recordsModifiedSince;
