import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * List Email Inbox Knowledge — List the knowledge items attached to a email inbox. Paginated.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  emailInboxId: string;
  limit?: number;
  nextCursor?: string;
}

const emailInboxKnowledgeList: ActionDefinition<Input> = {
  key: "email-inbox-knowledge-list",
  type: "read",
  resource: "knowledge",
  title: "List Email Inbox Knowledge",
  description: "List the knowledge items attached to a email inbox. Paginated.",
  params: [
    {
      "key": "emailInboxId",
      "label": "Email Inbox ID",
      "type": "string",
      "required": true,
      "hint": "The inbox ID; for the knowledge endpoints Aidbase also accepts the inbox alias.",
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
    return new AidbaseClient(ctx).page(`/email-inbox/${encodeId(input.emailInboxId)}/knowledge`, {
      query: { limit: input.limit, next_cursor: input.nextCursor },
    });
  },
};

export default emailInboxKnowledgeList;
