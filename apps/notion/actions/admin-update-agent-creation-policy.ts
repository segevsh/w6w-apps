import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  spaceId: string;
  policy: "all_workspace_members" | "disabled" | "workspace_owners_only";
  disableExistingAgents?: boolean;
}

/** PATCH /admin/v1/spaces/{space_id}/agents/creation_policy — update-agent-creation-policy. */
const action: ActionDefinition<Input> = {
  key: "admin-update-agent-creation-policy",
  type: "perform",
  resource: "admin",
  title: "Admin: Update who can create agents in a space",
  description:
    "Admin: Update who can create agents in a space. Requires an Enterprise organization bot token.",
  output: [
    { "key": "agent_counts", "type": "object", "label": "Agent counts" },
    { "key": "current_policy", "type": "object", "label": "Current policy" },
    {
      "key": "current_policy_description",
      "type": "string",
      "label": "Current policy description",
    },
    { "key": "space_id", "type": "string", "label": "Space id" },
    { "key": "space_name", "type": "string", "label": "Space name" },
  ],
  idempotent: false,
  params: [{
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, {
    "key": "policy",
    "label": "Policy",
    "type": "select",
    "required": true,
    "options": [{ "value": "all_workspace_members", "label": "all_workspace_members" }, {
      "value": "disabled",
      "label": "disabled",
    }, { "value": "workspace_owners_only", "label": "workspace_owners_only" }],
    "hint": "One of: `all_workspace_members`, `disabled`, `workspace_owners_only`",
  }, {
    "key": "disableExistingAgents",
    "label": "Disable Existing Agents",
    "type": "boolean",
    "hint":
      'When true, also disable all existing custom agents in the workspace. Only takes effect when policy is "disabled".',
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/spaces/${pathId(input.spaceId)}/agents/creation_policy`, {
      method: "PATCH",
      admin: true,
      body: {
        "policy": input.policy,
        "disable_existing_agents": input.disableExistingAgents,
      },
    });
  },
};

export default action;
