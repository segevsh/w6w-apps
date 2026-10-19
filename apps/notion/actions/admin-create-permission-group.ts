import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  spaceId: string;
  name: string;
}

/** POST /admin/v1/spaces/{space_id}/groups — create-permission-group. */
const action: ActionDefinition<Input> = {
  key: "admin-create-permission-group",
  type: "perform",
  resource: "admin",
  title: "Admin: Create a group",
  description: "Admin: Create a group. Requires an Enterprise organization bot token.",
  output: [{ "key": "object", "type": "string", "label": "Object" }, {
    "key": "id",
    "type": "string",
    "label": "Id",
  }, { "key": "name", "type": "string", "label": "Name" }],
  idempotent: false,
  params: [{
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
    "hint": "The name of the group.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/spaces/${pathId(input.spaceId)}/groups`, {
      method: "POST",
      admin: true,
      body: {
        "name": input.name,
      },
    });
  },
};

export default action;
