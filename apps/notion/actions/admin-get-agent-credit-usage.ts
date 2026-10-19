import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  agentId: string;
  spaceId: string;
  startCursor?: string;
}

/** GET /admin/v1/spaces/{space_id}/agents/{agent_id}/credit_usage — get-agent-credit-usage. */
const action: ActionDefinition<Input> = {
  key: "admin-get-agent-credit-usage",
  type: "read",
  resource: "admin",
  title: "Admin: Get credit usage for an agent in a space",
  description:
    "Admin: Get credit usage for an agent in a space. Requires an Enterprise organization bot token.",
  output: [
    {
      "key": "credit_per_billing_period_list",
      "type": "array",
      "label": "Credit per billing period list",
    },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "runs_completed", "type": "number", "label": "Runs completed" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "total_credits_used", "type": "number", "label": "Total credits used" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "created_by_id", "type": "string", "label": "Created by id" },
    { "key": "credit_limit", "type": "number", "label": "Credit limit" },
    { "key": "last_credit_usage_time", "type": "number", "label": "Last credit usage time" },
    { "key": "name", "type": "string", "label": "Name" },
    { "key": "next_cursor", "type": "string", "label": "Next cursor" },
  ],
  params: [{
    "key": "agentId",
    "label": "Agent ID",
    "type": "string",
    "required": true,
    "hint": "The ID of a custom agent or database Autofill agent.",
  }, {
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, {
    "key": "startCursor",
    "label": "Start Cursor",
    "type": "string",
    "hint":
      "Pagination cursor returned from a previous response's next_cursor; paginates credit_per_billing_period_list (newest period first).",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(
      `/spaces/${pathId(input.spaceId)}/agents/${pathId(input.agentId)}/credit_usage`,
      {
        method: "GET",
        admin: true,
        query: {
          "start_cursor": input.startCursor,
        },
      },
    );
  },
};

export default action;
