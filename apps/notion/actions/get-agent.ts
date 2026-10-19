import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  agentId: string;
  verbose?: boolean;
}

/** GET /v1/agents/{agent_id} — get-agent. */
const action: ActionDefinition<Input> = {
  key: "get-agent",
  type: "read",
  resource: "agent",
  title: "Get Agent",
  description: "Get agent.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "object", "label": "Id" },
    { "key": "agent_type", "type": "string", "label": "Agent type" },
    { "key": "name", "type": "string", "label": "Name" },
    { "key": "description", "type": "object", "label": "Description" },
    { "key": "instructions_page_id", "type": "object", "label": "Instructions page id" },
    { "key": "icon", "type": "object", "label": "Icon" },
    { "key": "model", "type": "object", "label": "Model" },
    { "key": "connections", "type": "array", "label": "Connections" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "pause_reason", "type": "object", "label": "Pause reason" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "version", "type": "object", "label": "Version" },
    { "key": "agent_version", "type": "object", "label": "Agent version" },
    { "key": "has_unpublished_changes", "type": "object", "label": "Has unpublished changes" },
    { "key": "last_run_time", "type": "object", "label": "Last run time" },
    { "key": "last_run_at", "type": "object", "label": "Last run at" },
    { "key": "credit_limit", "type": "object", "label": "Credit limit" },
    { "key": "triggers", "type": "array", "label": "Triggers" },
    { "key": "is_favorited", "type": "object", "label": "Is favorited" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "instructions", "type": "object", "label": "Instructions" },
  ],
  params: [{
    "key": "agentId",
    "label": "Agent ID",
    "type": "string",
    "required": true,
    "hint":
      "The agent ID (a UUID), or `notion_ai` for the personal agent. Endpoint-specific restrictions still apply.",
  }, {
    "key": "verbose",
    "label": "Verbose",
    "type": "boolean",
    "hint": "Whether to include the agent's inline instructions. Defaults to false.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/agents/${pathId(input.agentId)}`, {
      method: "GET",
      query: {
        "verbose": input.verbose,
      },
    });
  },
};

export default action;
