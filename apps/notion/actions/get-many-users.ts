import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  startCursor?: string;
  pageSize?: number;
}

/** GET /v1/users — get-users. */
const action: ActionDefinition<Input> = {
  key: "get-many-users",
  type: "read",
  resource: "user",
  title: "Get Many Users",
  description: "List all users.",
  output: [
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "user", "type": "object", "label": "User" },
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "next_cursor", "type": "string", "label": "Next cursor" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "results", "type": "array", "label": "Results" },
  ],
  params: [{ "key": "startCursor", "label": "Start Cursor", "type": "string" }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "number",
    "hint": "Number of results per page (1–100).",
    "validation": { "min": 1, "max": 100 },
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/users`, {
      method: "GET",
      query: {
        "start_cursor": input.startCursor,
        "page_size": input.pageSize ?? 100,
      },
    });
  },
};

export default action;
