import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * List Website Sub-Pages — List the sub-pages crawled for a website knowledge item. Only applies to items of type website.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  knowledgeId: string;
  limit?: number;
  nextCursor?: string;
}

const knowledgeSubPageList: ActionDefinition<Input> = {
  key: "knowledge-sub-page-list",
  type: "read",
  resource: "knowledge",
  title: "List Website Sub-Pages",
  description:
    "List the sub-pages crawled for a website knowledge item. Only applies to items of type website.",
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
    return new AidbaseClient(ctx).page(`/knowledge/${encodeId(input.knowledgeId)}/sub-pages`, {
      query: { limit: input.limit, next_cursor: input.nextCursor },
    });
  },
};

export default knowledgeSubPageList;
