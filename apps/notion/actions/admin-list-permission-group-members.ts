import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  groupId: string;
  spaceId: string;
  pageSize?: number;
  startCursor?: string;
}

/** GET /admin/v1/spaces/{space_id}/groups/{group_id}/members — list-permission-group-members. */
const action: ActionDefinition<Input> = {
  key: "admin-list-permission-group-members",
  type: "read",
  resource: "admin",
  title: "Admin: List group members",
  description: "Admin: List group members. Requires an Enterprise organization bot token.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "next_cursor", "type": "object", "label": "Next cursor" },
  ],
  params: [{
    "key": "groupId",
    "label": "Group ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the group.",
  }, {
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "number",
    "hint":
      "Number of memberships to return (1–100; default 100). Number of results per page (1–100).",
    "validation": { "min": 1, "max": 100, "integer": true },
  }, {
    "key": "startCursor",
    "label": "Start Cursor",
    "type": "string",
    "hint": "Opaque continuation cursor from a previous page.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(
      `/spaces/${pathId(input.spaceId)}/groups/${pathId(input.groupId)}/members`,
      {
        method: "GET",
        admin: true,
        query: {
          "page_size": input.pageSize,
          "start_cursor": input.startCursor,
        },
      },
    );
  },
};

export default action;
