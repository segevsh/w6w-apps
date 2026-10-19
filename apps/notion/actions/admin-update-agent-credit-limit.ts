import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  agentId: string;
  spaceId: string;
  creditLimit: number | null;
}

/** PUT /admin/v1/spaces/{space_id}/agents/{agent_id}/credit_limit — update-agent-credit-limit. */
const action: ActionDefinition<Input> = {
  key: "admin-update-agent-credit-limit",
  type: "perform",
  resource: "admin",
  title: "Admin: Update credit limit for an agent in a space",
  description:
    "Admin: Update credit limit for an agent in a space. Requires an Enterprise organization bot token.",
  output: [
    {
      "key": "credit_limit_by_workspace_admin",
      "type": "object",
      "label": "Credit limit by workspace admin",
    },
    { "key": "enforced_credit_limit", "type": "object", "label": "Enforced credit limit" },
    { "key": "current_credit_usage", "type": "object", "label": "Current credit usage" },
    { "key": "did_clear_paused_state", "type": "boolean", "label": "Did clear paused state" },
    { "key": "is_active", "type": "boolean", "label": "Is active" },
  ],
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
    "key": "creditLimit",
    "label": "Credit Limit",
    "type": "json",
    "required": true,
    "hint": "The per-agent credit limit as a non-negative integer, or null to clear the limit.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(
      `/spaces/${pathId(input.spaceId)}/agents/${pathId(input.agentId)}/credit_limit`,
      {
        method: "PUT",
        admin: true,
        body: {
          "credit_limit": input.creditLimit,
        },
      },
    );
  },
};

export default action;
