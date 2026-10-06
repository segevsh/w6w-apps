import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient } from "../lib/client.ts";

/**
 * List Knowledge — List the knowledge items (websites, videos, documents, FAQs) in the account. Paginated.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  limit?: number;
  nextCursor?: string;
}

const knowledgeList: ActionDefinition<Input> = {
  key: "knowledge-list",
  type: "read",
  resource: "knowledge",
  title: "List Knowledge",
  description:
    "List the knowledge items (websites, videos, documents, FAQs) in the account. Paginated.",
  params: [
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
    return new AidbaseClient(ctx).page(`/knowledge`, {
      query: { limit: input.limit, next_cursor: input.nextCursor },
    });
  },
};

export default knowledgeList;
