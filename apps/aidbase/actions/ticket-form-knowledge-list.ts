import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * List Ticket Form Knowledge — List the knowledge items attached to a ticket form. Paginated.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  ticketFormId: string;
  limit?: number;
  nextCursor?: string;
}

const ticketFormKnowledgeList: ActionDefinition<Input> = {
  key: "ticket-form-knowledge-list",
  type: "read",
  resource: "knowledge",
  title: "List Ticket Form Knowledge",
  description: "List the knowledge items attached to a ticket form. Paginated.",
  params: [
    {
      "key": "ticketFormId",
      "label": "Ticket Form ID",
      "type": "string",
      "required": true,
      "hint":
        "The form's public ID (`public_id` from List Ticket Forms), as used in Aidbase's examples.",
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
    return new AidbaseClient(ctx).page(`/ticket-form/${encodeId(input.ticketFormId)}/knowledge`, {
      query: { limit: input.limit, next_cursor: input.nextCursor },
    });
  },
};

export default ticketFormKnowledgeList;
