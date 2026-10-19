import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  agentId: string;
  spaceId: string;
}

/** DELETE /admin/v1/spaces/{space_id}/agents/{agent_id} — delete-agent. */
const action: ActionDefinition<Input> = {
  key: "admin-delete-agent",
  type: "perform",
  resource: "admin",
  title: "Admin: Delete an agent in a space",
  description: "Admin: Delete an agent in a space. Requires an Enterprise organization bot token.",
  output: [{ "key": "object", "type": "string", "label": "Object" }],
  idempotent: false,
  params: [{
    "key": "agentId",
    "label": "Agent ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the custom agent (a UUID). The personal agent (Notion AI) is not supported.",
  }, {
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/spaces/${pathId(input.spaceId)}/agents/${pathId(input.agentId)}`, {
      method: "DELETE",
      admin: true,
    });
  },
};

export default action;
