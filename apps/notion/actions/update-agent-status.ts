import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  agentId: string;
  status: "active" | "disabled";
}

/** PATCH /v1/agents/{agent_id}/status — update-agent-status. */
const action: ActionDefinition<Input> = {
  key: "update-agent-status",
  type: "perform",
  resource: "agent",
  title: "Update Agent Status",
  description: "Update agent status.",
  output: [
    { "key": "agent_id", "type": "string", "label": "Agent id" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "pause_reason", "type": "object", "label": "Pause reason" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
  ],
  idempotent: false,
  params: [{
    "key": "agentId",
    "label": "Agent ID",
    "type": "string",
    "required": true,
    "hint":
      "The agent ID (a UUID), or `notion_ai` for the personal agent. Endpoint-specific restrictions still apply.",
  }, {
    "key": "status",
    "label": "Status",
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
    return client.request(`/agents/${pathId(input.agentId)}/status`, {
      method: "PATCH",
      body: {
        "status": input.status,
      },
    });
  },
};

export default action;
