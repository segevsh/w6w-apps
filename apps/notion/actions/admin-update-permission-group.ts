import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  groupId: string;
  spaceId: string;
  name: string;
}

/** PATCH /admin/v1/spaces/{space_id}/groups/{group_id} — update-permission-group. */
const action: ActionDefinition<Input> = {
  key: "admin-update-permission-group",
  type: "perform",
  resource: "admin",
  title: "Admin: Update a group",
  description: "Admin: Update a group. Requires an Enterprise organization bot token.",
  output: [{ "key": "object", "type": "string", "label": "Object" }, {
    "key": "id",
    "type": "string",
    "label": "Id",
  }, { "key": "name", "type": "string", "label": "Name" }],
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
    "key": "name",
    "label": "Name",
    "type": "string",
    "required": true,
    "hint": "The new name of the group.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/spaces/${pathId(input.spaceId)}/groups/${pathId(input.groupId)}`, {
      method: "PATCH",
      admin: true,
      body: {
        "name": input.name,
      },
    });
  },
};

export default action;
