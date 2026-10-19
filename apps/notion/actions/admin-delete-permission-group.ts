import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  groupId: string;
  spaceId: string;
  transferToOwnerId?: string;
}

/** DELETE /admin/v1/spaces/{space_id}/groups/{group_id} — delete-permission-group. */
const action: ActionDefinition<Input> = {
  key: "admin-delete-permission-group",
  type: "perform",
  resource: "admin",
  title: "Admin: Delete a group",
  description: "Admin: Delete a group. Requires an Enterprise organization bot token.",
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
    "key": "transferToOwnerId",
    "label": "Transfer To Owner ID",
    "type": "string",
    "hint": "Active workspace owner who receives access that would otherwise be orphaned.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/spaces/${pathId(input.spaceId)}/groups/${pathId(input.groupId)}`, {
      method: "DELETE",
      admin: true,
      query: {
        "transfer_to_owner_id": input.transferToOwnerId,
      },
    });
  },
};

export default action;
