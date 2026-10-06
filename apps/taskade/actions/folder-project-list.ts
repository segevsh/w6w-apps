import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  folderId: string;
}

/** `GET /folders/{folderId}/projects` */
const folderProjectList: ActionDefinition<Input> = {
  key: "folder-project-list",
  type: "search",
  resource: "project",
  title: "List Folder Projects",
  description: "List the projects in a folder.",
  params: [{
    "key": "folderId",
    "label": "Folder ID",
    "type": "string",
    "required": true,
    "hint": "A folder (subspace) id from List Folders.",
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
      `/folders/${seg(input.folderId)}/projects`,
    );
    const items = Array.isArray(res.items) ? res.items : [];
    return { items, count: items.length };
  },
};

export default folderProjectList;
