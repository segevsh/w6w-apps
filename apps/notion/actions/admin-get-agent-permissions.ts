import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  agentId: string;
  spaceId: string;
  cursor?: string;
}

/** GET /admin/v1/spaces/{space_id}/agents/{agent_id}/permissions — get-agent-permissions. */
const action: ActionDefinition<Input> = {
  key: "admin-get-agent-permissions",
  type: "read",
  resource: "admin",
  title: "Admin: Get a custom agent's sharing permissions",
  description:
    "Admin: Get a custom agent's sharing permissions. Requires an Enterprise organization bot token.",
  output: [{ "key": "permissions", "type": "array", "label": "Permissions" }, {
    "key": "next_cursor",
    "type": "string",
    "label": "Next cursor",
  }],
  params: [{
    "key": "agentId",
    "label": "Agent ID",
    "type": "string",
    "required": true,
    "hint": "The custom agent whose permissions to return.",
  }, {
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, {
    "key": "cursor",
    "label": "Cursor",
    "type": "string",
    "hint": "Opaque pagination cursor from a prior response's next_cursor.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(
      `/spaces/${pathId(input.spaceId)}/agents/${pathId(input.agentId)}/permissions`,
      {
        method: "GET",
        admin: true,
        query: {
          "cursor": input.cursor,
        },
      },
    );
  },
};

export default action;
