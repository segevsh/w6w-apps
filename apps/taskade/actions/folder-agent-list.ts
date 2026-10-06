import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  folderId: string;
  limit?: number;
  page?: number;
}

/** `GET /folders/{folderId}/agents` */
const folderAgentList: ActionDefinition<Input> = {
  key: "folder-agent-list",
  type: "search",
  resource: "agent",
  title: "List Folder Agents",
  description: "List the AI agents in a folder.",
  params: [{
    "key": "folderId",
    "label": "Folder ID",
    "type": "string",
    "required": true,
    "hint": "A folder (subspace) id from List Folders.",
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
      `/folders/${seg(input.folderId)}/agents`,
      { query: { limit: input.limit, page: input.page } },
    );
    const items = Array.isArray(res.items) ? res.items : [];
    return { items, count: items.length };
  },
};

export default folderAgentList;
