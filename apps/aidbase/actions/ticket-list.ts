import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * List Tickets — List the tickets submitted to a form, optionally filtered by status and date range. Paginated.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  ticketFormId: string;
  status?: string;
  createdBefore?: string;
  createdAfter?: string;
  limit?: number;
  nextCursor?: string;
}

const ticketList: ActionDefinition<Input> = {
  key: "ticket-list",
  type: "read",
  resource: "ticket",
  title: "List Tickets",
  description:
    "List the tickets submitted to a form, optionally filtered by status and date range. Paginated.",
  params: [
    {
      "key": "ticketFormId",
      "label": "Ticket Form ID",
      "type": "string",
      "required": true,
      "hint": "The form's public ID (`public_id` from List Ticket Forms).",
    },
    {
      "key": "status",
      "label": "Statuses",
      "type": "string",
      "hint":
        "Comma-separated, e.g. open,assigned. Valid: open, assigned, need_more_info, resolved, closed. Aidbase answers 400 on an invalid value.",
    },
    {
      "key": "createdBefore",
      "label": "Created before",
      "type": "string",
      "hint":
        "Only tickets created before this time (ISO 8601 or a date such as 2026-02-01). Aidbase answers 400 on an invalid date.",
    },
    {
      "key": "createdAfter",
      "label": "Created after",
      "type": "string",
      "hint":
        "Only tickets created after this time (ISO 8601 or a date such as 2026-01-01). Aidbase answers 400 on an invalid date.",
    },
    {
      "key": "limit",
      "label": "Page size",
      "type": "number",
      "hint": "Items per page (Aidbase default 25).",
    },
    {
      "key": "nextCursor",
      "label": "Cursor",
      "type": "string",
      "hint": "`nextCursor` from the previous page, to fetch the next one.",
    },
  ],
  output: [
    {
      "key": "items",
      "type": "array",
      "label": "Items on this page",
    },
    {
      "key": "total",
      "type": "number",
      "label": "Total items matching",
    },
    {
      "key": "hasMore",
      "type": "boolean",
      "label": "True when another page exists",
    },
    {
      "key": "nextCursor",
      "type": "string",
      "label": "Cursor for the next page, null on the last page",
    },
    {
      "key": "count",
      "type": "number",
      "label": "Items on this page",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).page(`/ticket-form/${encodeId(input.ticketFormId)}/tickets`, {
      query: {
        status: input.status,
        created_before: input.createdBefore,
        created_after: input.createdAfter,
        limit: input.limit,
        next_cursor: input.nextCursor,
      },
    });
  },
};

export default ticketList;
