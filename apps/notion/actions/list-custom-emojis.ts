import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  startCursor?: string;
  pageSize?: number;
  name?: string;
}

/** GET /v1/custom_emojis — list-custom-emojis. */
const action: ActionDefinition<Input> = {
  key: "list-custom-emojis",
  type: "read",
  resource: "customEmoji",
  title: "List Custom Emojis",
  description: "List custom emojis.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "next_cursor", "type": "object", "label": "Next cursor" },
  ],
  params: [{
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
  }, {
    "key": "name",
    "label": "Name",
    "type": "string",
    "hint":
      "If supplied, filters custom emojis by exact name match. Useful for resolving a custom emoji name to its ID.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/custom_emojis`, {
      method: "GET",
      query: {
        "start_cursor": input.startCursor,
        "page_size": input.pageSize,
        "name": input.name,
      },
    });
  },
};

export default action;
