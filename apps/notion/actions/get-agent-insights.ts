import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  agentId: string;
  startTime?: number;
  endTime?: number;
}

/** GET /v1/agents/{agent_id}/insights — get-agent-insights. */
const action: ActionDefinition<Input> = {
  key: "get-agent-insights",
  type: "read",
  resource: "agent",
  title: "Get Agent Insights",
  description: "Get agent insights.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "object", "label": "Id" },
    { "key": "name", "type": "string", "label": "Name" },
    { "key": "agent_type", "type": "string", "label": "Agent type" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "pause_reason", "type": "object", "label": "Pause reason" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "total_credits_used", "type": "number", "label": "Total credits used" },
    { "key": "credit_limit", "type": "object", "label": "Credit limit" },
    { "key": "runs_completed", "type": "number", "label": "Runs completed" },
  ],
  params: [{
    "key": "agentId",
    "label": "Agent ID",
    "type": "string",
    "required": true,
    "hint":
      "The agent ID (a UUID), or `notion_ai` for the personal agent. Endpoint-specific restrictions still apply.",
  }, {
    "key": "startTime",
    "label": "Start Time",
    "type": "number",
    "hint":
      "Start of the insights window, as an epoch timestamp in seconds. Must be supplied together with `end_time`; if either is omitted the window defaults to the current billing period.",
    "validation": { "min": 0, "integer": true },
  }, {
    "key": "endTime",
    "label": "End Time",
    "type": "number",
    "hint":
      "End of the insights window, as an epoch timestamp in seconds. Must be supplied together with `start_time`; if either is omitted the window defaults to the current billing period.",
    "validation": { "min": 0, "integer": true },
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/agents/${pathId(input.agentId)}/insights`, {
      method: "GET",
      query: {
        "start_time": input.startTime,
        "end_time": input.endTime,
      },
    });
  },
};

export default action;
