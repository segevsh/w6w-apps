import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  spaceId: string;
  defaultAgentCreditLimit: number | null;
}

/** PATCH /admin/v1/spaces/{space_id}/credit_limit — update-workspace-credit-limit. */
const action: ActionDefinition<Input> = {
  key: "admin-update-workspace-credit-limit",
  type: "perform",
  resource: "admin",
  title: "Admin: Update the default agent credit limit for a workspace",
  description:
    "Admin: Update the default agent credit limit for a workspace. Requires an Enterprise organization bot token.",
  output: [{ "key": "space_id", "type": "string", "label": "Space id" }, {
    "key": "default_agent_credit_limit",
    "type": "object",
    "label": "Default agent credit limit",
  }],
  idempotent: false,
  params: [{
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, {
    "key": "defaultAgentCreditLimit",
    "label": "Default Agent Credit Limit",
    "type": "json",
    "required": true,
    "hint":
      "Workspace-wide default agent credit limit, applied to agents going forward. Must be a non-negative whole number of credits; other values are rejected with a validation error. Use null to remove the workspace-wide default cap.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/spaces/${pathId(input.spaceId)}/credit_limit`, {
      method: "PATCH",
      admin: true,
      body: {
        "default_agent_credit_limit": input.defaultAgentCreditLimit,
      },
    });
  },
};

export default action;
