import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  spaceId: string;
  startCursor?: string;
  pageSize?: number;
}

/** GET /admin/v1/spaces/{space_id}/users — list-users. */
const action: ActionDefinition<Input> = {
  key: "admin-list-users",
  type: "read",
  resource: "admin",
  title: "Admin: List users",
  description: "Admin: List users. Requires an Enterprise organization bot token.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "next_cursor", "type": "object", "label": "Next cursor" },
  ],
  params: [{
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, {
    "key": "startCursor",
    "label": "Start Cursor",
    "type": "string",
    "hint": "Opaque continuation cursor from a previous user page.",
  }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "number",
    "hint":
      "Number of users and bots to return (1–100; default 100). Number of results per page (1–100).",
    "validation": { "min": 1, "max": 100, "integer": true },
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/spaces/${pathId(input.spaceId)}/users`, {
      method: "GET",
      admin: true,
      query: {
        "start_cursor": input.startCursor,
        "page_size": input.pageSize,
      },
    });
  },
};

export default action;
