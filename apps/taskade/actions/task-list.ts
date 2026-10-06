import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  limit?: number;
  after?: string;
  before?: string;
}

/** `GET /projects/{projectId}/tasks` */
const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List the tasks in a project, with cursor pagination by task id.",
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
    "key": "after",
    "label": "After task ID",
    "type": "string",
    "hint": "Cursor: return tasks after this task id. Do not combine with Before.",
  }, {
    "key": "before",
    "label": "Before task ID",
    "type": "string",
    "hint": "Cursor: return tasks before this task id. Do not combine with After.",
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
    {
      "key": "nextAfter",
      "type": "string",
      "label": "Task id to pass as After for the next page, or null when the page was short",
    },
  ],

  async execute(input, ctx) {
    const res = await new TaskadeClient(ctx).request<Record<string, unknown>>(
      "GET",
      `/projects/${seg(input.projectId)}/tasks`,
      { query: { limit: input.limit, after: input.after, before: input.before } },
    );
    const items = Array.isArray(res.items) ? res.items : [];
    const limit = input.limit ?? 100;
    const last = items[items.length - 1] as { id?: string } | undefined;
    return {
      items,
      count: items.length,
      nextAfter: items.length >= limit ? last?.id ?? null : null,
    };
  },
};

export default taskList;
