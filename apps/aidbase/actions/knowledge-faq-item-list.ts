import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * List FAQ Items — List the question/answer items of an FAQ knowledge item. Only applies to items of type faq.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  knowledgeId: string;
  limit?: number;
  nextCursor?: string;
}

const knowledgeFaqItemList: ActionDefinition<Input> = {
  key: "knowledge-faq-item-list",
  type: "read",
  resource: "faq-item",
  title: "List FAQ Items",
  description:
    "List the question/answer items of an FAQ knowledge item. Only applies to items of type faq.",
  params: [
    {
      "key": "knowledgeId",
      "label": "Knowledge ID",
      "type": "string",
      "required": true,
      "hint": "ID of the knowledge item (from List Knowledge).",
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
    return new AidbaseClient(ctx).page(`/knowledge/${encodeId(input.knowledgeId)}/faq-items`, {
      query: { limit: input.limit, next_cursor: input.nextCursor },
    });
  },
};

export default knowledgeFaqItemList;
