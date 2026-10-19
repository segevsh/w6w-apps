import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  groupId: string;
  userId: string;
  spaceId: string;
}

/** DELETE /admin/v1/spaces/{space_id}/groups/{group_id}/members/users/{user_id} — remove-permission-group-member. */
const action: ActionDefinition<Input> = {
  key: "admin-remove-permission-group-member",
  type: "perform",
  resource: "admin",
  title: "Admin: Remove a group member",
  description: "Admin: Remove a group member. Requires an Enterprise organization bot token.",
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
    "key": "userId",
    "label": "User ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the user.",
  }, {
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(
      `/spaces/${pathId(input.spaceId)}/groups/${pathId(input.groupId)}/members/users/${
        pathId(input.userId)
      }`,
      {
        method: "DELETE",
        admin: true,
      },
    );
  },
};

export default action;
