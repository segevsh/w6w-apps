import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
}

/** `GET /projects/{projectId}/fields` */
const projectFieldList: ActionDefinition<Input> = {
  key: "project-field-list",
  type: "search",
  resource: "project",
  title: "List Project Fields",
  description: "List the custom field definitions of a project.",
  params: [{
    "key": "projectId",
    "label": "Project ID",
    "type": "string",
    "required": true,
    "hint": "A project id from List Folder Projects or List My Projects.",
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
      `/projects/${seg(input.projectId)}/fields`,
    );
    const items = Array.isArray(res.items) ? res.items : [];
    return { items, count: items.length };
  },
};

export default projectFieldList;
