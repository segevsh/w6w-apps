import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  groupId: string;
  spaceId: string;
  member: Record<string, unknown>;
  role: "owner" | "member";
}

/** POST /admin/v1/spaces/{space_id}/groups/{group_id}/members — add-permission-group-member. */
const action: ActionDefinition<Input> = {
  key: "admin-add-permission-group-member",
  type: "perform",
  resource: "admin",
  title: "Admin: Add a group member",
  description: "Admin: Add a group member. Requires an Enterprise organization bot token.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "group_id", "type": "string", "label": "Group id" },
    { "key": "member", "type": "object", "label": "Member" },
    { "key": "role", "type": "string", "label": "Role" },
  ],
  idempotent: false,
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
    "key": "member",
    "label": "Member",
    "type": "json",
    "required": true,
    "hint": "The user to add as a direct member.",
  }, {
    "key": "role",
    "label": "Role",
    "type": "select",
    "required": true,
    "options": [{ "value": "owner", "label": "owner" }, { "value": "member", "label": "member" }],
    "hint": "The user's role in the group.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(
      `/spaces/${pathId(input.spaceId)}/groups/${pathId(input.groupId)}/members`,
      {
        method: "POST",
        admin: true,
        body: {
          "member": input.member,
          "role": input.role,
        },
      },
    );
  },
};

export default action;
