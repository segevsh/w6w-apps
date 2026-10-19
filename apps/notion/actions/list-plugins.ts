import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  pageSize?: number;
  startCursor?: string;
}

/** GET /v1/ai/plugins — list-skills-plugins. */
const action: ActionDefinition<Input> = {
  key: "list-plugins",
  type: "read",
  resource: "agentSkill",
  title: "List Plugins",
  description: "List skills plugins.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "next_cursor", "type": "object", "label": "Next cursor" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "type", "type": "string", "label": "Type" },
  ],
  params: [{
    "key": "pageSize",
    "label": "Page Size",
    "type": "number",
    "hint": "The number of items to return. Maximum: 100. Number of results per page (1–100).",
    "validation": { "min": 1, "max": 100, "integer": true },
  }, {
    "key": "startCursor",
    "label": "Start Cursor",
    "type": "string",
    "hint": "An opaque cursor returned by the previous page of results.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/ai/plugins`, {
      method: "GET",
      query: {
        "page_size": input.pageSize,
        "start_cursor": input.startCursor,
      },
    });
  },
};

export default action;
