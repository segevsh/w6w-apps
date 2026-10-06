import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  agentId: string;
  limit?: number;
  page?: number;
}

/** `GET /agents/{agentId}/convos/` */
const agentConversationList: ActionDefinition<Input> = {
  key: "agent-conversation-list",
  type: "search",
  resource: "agent",
  title: "List Agent Conversations",
  description: "List an AI agent's conversations.",
  params: [{
    "key": "agentId",
    "label": "Agent ID",
    "type": "string",
    "required": true,
    "hint": "An agent id from List Folder Agents.",
  }, {
    "key": "limit",
    "label": "Limit",
    "type": "number",
    "hint": "Maximum items to return.",
    "validation": {
      "min": 1,
      "max": 1000,
      "integer": true,
    },
  }, {
    "key": "page",
    "label": "Page",
    "type": "number",
    "hint": "Page number of results.",
    "validation": {
      "min": 1,
      "integer": true,
    },
  }],
  output: [
    {
      "key": "items",
      "type": "array",
      "label": "Items returned",
    },
    {
      "key": "count",
      "type": "number",
      "label": "Number of items returned",
    },
  ],

  async execute(input, ctx) {
    const res = await new TaskadeClient(ctx).request<Record<string, unknown>>(
      "GET",
      `/agents/${seg(input.agentId)}/convos/`,
      { query: { limit: input.limit, page: input.page } },
    );
    const items = Array.isArray(res.items) ? res.items : [];
    return { items, count: items.length };
  },
};

export default agentConversationList;
