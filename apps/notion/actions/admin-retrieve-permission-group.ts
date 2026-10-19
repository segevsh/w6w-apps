import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  groupId: string;
  spaceId: string;
}

/** GET /admin/v1/spaces/{space_id}/groups/{group_id} — retrieve-permission-group. */
const action: ActionDefinition<Input> = {
  key: "admin-retrieve-permission-group",
  type: "read",
  resource: "admin",
  title: "Admin: Retrieve a group",
  description: "Admin: Retrieve a group. Requires an Enterprise organization bot token.",
  output: [{ "key": "object", "type": "string", "label": "Object" }, {
    "key": "id",
    "type": "string",
    "label": "Id",
  }, { "key": "name", "type": "string", "label": "Name" }],
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
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/spaces/${pathId(input.spaceId)}/groups/${pathId(input.groupId)}`, {
      method: "GET",
      admin: true,
    });
  },
};

export default action;
