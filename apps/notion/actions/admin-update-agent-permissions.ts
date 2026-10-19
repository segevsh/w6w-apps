import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  agentId: string;
  spaceId: string;
  set?: unknown[];
  remove?: unknown[];
}

/** PATCH /admin/v1/spaces/{space_id}/agents/{agent_id}/permissions — update-agent-permissions. */
const action: ActionDefinition<Input> = {
  key: "admin-update-agent-permissions",
  type: "perform",
  resource: "admin",
  title: "Admin: Update a custom agent's sharing permissions",
  description:
    "Admin: Update a custom agent's sharing permissions. Requires an Enterprise organization bot token.",
  output: [{ "key": "permissions", "type": "array", "label": "Permissions" }],
  idempotent: false,
  params: [{
    "key": "agentId",
    "label": "Agent ID",
    "type": "string",
    "required": true,
    "hint": "The custom agent whose permissions to update.",
  }, {
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, {
    "key": "set",
    "label": "Set",
    "type": "json",
    "hint": "Principals to grant permissions to, or update the level for.",
  }, {
    "key": "remove",
    "label": "Remove",
    "type": "json",
    "hint": "Principals to revoke permissions for.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(
      `/spaces/${pathId(input.spaceId)}/agents/${pathId(input.agentId)}/permissions`,
      {
        method: "PATCH",
        admin: true,
        body: {
          "set": input.set,
          "remove": input.remove,
        },
      },
    );
  },
};

export default action;
