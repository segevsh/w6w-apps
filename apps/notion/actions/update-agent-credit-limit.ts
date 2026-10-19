import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  agentId: string;
  creditLimit: number | null;
}

/** PATCH /v1/agents/{agent_id}/credit_limit — update-agent-credit-limit. */
const action: ActionDefinition<Input> = {
  key: "update-agent-credit-limit",
  type: "perform",
  resource: "agent",
  title: "Update Agent Credit Limit",
  description: "Update agent credit limit.",
  output: [{ "key": "agent_id", "type": "string", "label": "Agent id" }, {
    "key": "credit_limit",
    "type": "object",
    "label": "Credit limit",
  }, { "key": "last_edited_time", "type": "string", "label": "Last edited time" }],
  idempotent: false,
  params: [{
    "key": "agentId",
    "label": "Agent ID",
    "type": "string",
    "required": true,
    "hint":
      "The ID of the custom agent (a UUID). The personal agent (Notion AI) is not supported by this endpoint.",
  }, {
    "key": "creditLimit",
    "label": "Credit Limit",
    "type": "json",
    "required": true,
    "hint": "The per-agent credit limit as a non-negative integer, or null to clear the limit.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/agents/${pathId(input.agentId)}/credit_limit`, {
      method: "PATCH",
      body: {
        "credit_limit": input.creditLimit,
      },
    });
  },
};

export default action;
