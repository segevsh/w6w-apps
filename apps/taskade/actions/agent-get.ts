import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  agentId: string;
}

/** `GET /agents/{agentId}` */
const agentGet: ActionDefinition<Input> = {
  key: "agent-get",
  type: "read",
  resource: "agent",
  title: "Get Agent",
  description: "Read an AI agent's configuration.",
  params: [{
    "key": "agentId",
    "label": "Agent ID",
    "type": "string",
    "required": true,
    "hint": "An agent id from List Folder Agents.",
  }],
  output: [
    {
      "key": "item",
      "type": "object",
      "label": "The resource Taskade returned",
    },
  ],

  async execute(input, ctx) {
    const res = await new TaskadeClient(ctx).request<Record<string, unknown>>(
      "GET",
      `/agents/${seg(input.agentId)}`,
    );
    return { item: res.item ?? null };
  },
};

export default agentGet;
