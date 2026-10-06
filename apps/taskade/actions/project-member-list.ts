import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  limit?: number;
  page?: number;
}

/** `GET /projects/{projectId}/members` */
const projectMemberList: ActionDefinition<Input> = {
  key: "project-member-list",
  type: "search",
  resource: "project",
  title: "List Project Members",
  description: "List the members of a project.",
  params: [{
    "key": "projectId",
    "label": "Project ID",
    "type": "string",
    "required": true,
    "hint": "A project id from List Folder Projects or List My Projects.",
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
      `/projects/${seg(input.projectId)}/members`,
      { query: { limit: input.limit, page: input.page } },
    );
    const items = Array.isArray(res.items) ? res.items : [];
    return { items, count: items.length };
  },
};

export default projectMemberList;
