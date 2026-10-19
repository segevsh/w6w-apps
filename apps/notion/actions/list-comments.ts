import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  blockId: string;
  startCursor?: string;
  pageSize?: number;
}

/** GET /v1/comments — list-comments. */
const action: ActionDefinition<Input> = {
  key: "list-comments",
  type: "read",
  resource: "comment",
  title: "List Comments",
  description: "List comments.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "next_cursor", "type": "object", "label": "Next cursor" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "comment", "type": "object", "label": "Comment" },
    { "key": "request_status", "type": "object", "label": "Request status" },
  ],
  params: [{
    "key": "blockId",
    "label": "Block ID",
    "type": "string",
    "required": true,
    "hint": "Identifier for a Notion block or page.",
  }, {
    "key": "startCursor",
    "label": "Start Cursor",
    "type": "string",
    "hint":
      "If supplied, this endpoint will return a page of results starting after the cursor provided. If not supplied, this endpoint will return the first page of results.",
  }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "number",
    "hint":
      "The number of items from the full list desired in the response. Maximum: 100 Number of results per page (1–100).",
    "validation": { "min": 1, "max": 100, "integer": true },
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/comments`, {
      method: "GET",
      query: {
        "block_id": input.blockId,
        "start_cursor": input.startCursor,
        "page_size": input.pageSize,
      },
    });
  },
};

export default action;
