import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  agentId: string;
  spaceId: string;
  adminStatus: "active" | "disabled";
}

/** PATCH /admin/v1/spaces/{space_id}/agents/{agent_id}/status — update-agent-status. */
const action: ActionDefinition<Input> = {
  key: "admin-update-agent-status",
  type: "perform",
  resource: "admin",
  title: "Admin: Disable or re-enable an agent in a space",
  description:
    "Admin: Disable or re-enable an agent in a space. Requires an Enterprise organization bot token.",
  output: [{ "key": "admin_status", "type": "string", "label": "Admin status" }, {
    "key": "run_status",
    "type": "string",
    "label": "Run status",
  }, { "key": "paused_reason", "type": "string", "label": "Paused reason" }],
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
  }, {
    "key": "adminStatus",
    "label": "Admin Status",
    "type": "select",
    "required": true,
    "options": [{ "value": "active", "label": "active" }, {
      "value": "disabled",
      "label": "disabled",
    }],
    "hint":
      'Set to "active" to re-enable an agent that was disabled through this API, or "disabled" to turn off a running agent.',
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(
      `/spaces/${pathId(input.spaceId)}/agents/${pathId(input.agentId)}/status`,
      {
        method: "PATCH",
        admin: true,
        body: {
          "admin_status": input.adminStatus,
        },
      },
    );
  },
};

export default action;
