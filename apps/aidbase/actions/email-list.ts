import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * List Emails — List the emails in an inbox, optionally filtered by status and date range. Paginated.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  emailInboxId: string;
  status?: string;
  createdBefore?: string;
  createdAfter?: string;
  limit?: number;
  nextCursor?: string;
}

const emailList: ActionDefinition<Input> = {
  key: "email-list",
  type: "read",
  resource: "email",
  title: "List Emails",
  description:
    "List the emails in an inbox, optionally filtered by status and date range. Paginated.",
  params: [
    {
      "key": "emailInboxId",
      "label": "Email Inbox ID",
      "type": "string",
      "required": true,
      "hint": "The inbox ID.",
    },
    {
      "key": "status",
      "label": "Statuses",
      "type": "string",
      "hint":
        "Comma-separated, e.g. open,resolved. Valid: open, assigned, need_more_info, resolved, closed. Aidbase answers 400 on an invalid value.",
    },
    {
      "key": "createdBefore",
      "label": "Created before",
      "type": "string",
      "hint":
        "Only emails created before this time (ISO 8601 or a date such as 2026-02-01). Aidbase answers 400 on an invalid date.",
    },
    {
      "key": "createdAfter",
      "label": "Created after",
      "type": "string",
      "hint":
        "Only emails created after this time (ISO 8601 or a date such as 2026-01-01). Aidbase answers 400 on an invalid date.",
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
    return new AidbaseClient(ctx).page(`/email-inbox/${encodeId(input.emailInboxId)}/emails`, {
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

export default emailList;
