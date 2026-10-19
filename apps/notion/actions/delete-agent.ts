import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  agentId: string;
}

/** DELETE /v1/agents/{agent_id} — delete-agent. */
const action: ActionDefinition<Input> = {
  key: "delete-agent",
  type: "perform",
  resource: "agent",
  title: "Delete Agent",
  description: "Delete agent.",
  output: [{ "key": "agent_id", "type": "string", "label": "Agent id" }, {
    "key": "status",
    "type": "string",
    "label": "Status",
  }, { "key": "deleted_at", "type": "string", "label": "Deleted at" }],
  idempotent: false,
  params: [{
    "key": "agentId",
    "label": "Agent ID",
    "type": "string",
    "required": true,
    "hint":
      "The agent ID (a UUID), or `notion_ai` for the personal agent. The personal agent cannot be deleted.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/agents/${pathId(input.agentId)}`, {
      method: "DELETE",
    });
  },
};

export default action;
