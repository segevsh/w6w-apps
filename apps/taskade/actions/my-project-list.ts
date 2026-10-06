import type { ActionDefinition } from "@w6w/types";
import { TaskadeClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  page?: number;
  sort?: string;
}

/** `GET /me/projects` */
const myProjectList: ActionDefinition<Input> = {
  key: "my-project-list",
  type: "search",
  resource: "project",
  title: "List My Projects",
  description: "List the projects the token owner has access to.",
  params: [{
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
  }, {
    "key": "sort",
    "label": "Sort",
    "type": "select",
    "options": [
      {
        "value": "viewed-desc",
        "label": "Recently viewed first",
      },
      {
        "value": "viewed-asc",
        "label": "Least recently viewed first",
      },
    ],
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
      `/me/projects`,
      { query: { limit: input.limit, page: input.page, sort: input.sort } },
    );
    const items = Array.isArray(res.items) ? res.items : [];
    return { items, count: items.length };
  },
};

export default myProjectList;
