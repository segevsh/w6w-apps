import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
}

/** `GET /workspaces/{workspaceId}/folders` */
const folderList: ActionDefinition<Input> = {
  key: "folder-list",
  type: "search",
  resource: "folder",
  title: "List Folders",
  description: "List the folders (subspaces) in a workspace.",
  params: [{
    "key": "workspaceId",
    "label": "Workspace ID",
    "type": "string",
    "required": true,
    "hint": "From List Workspaces.",
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
      `/workspaces/${seg(input.workspaceId)}/folders`,
    );
    const items = Array.isArray(res.items) ? res.items : [];
    return { items, count: items.length };
  },
};

export default folderList;
