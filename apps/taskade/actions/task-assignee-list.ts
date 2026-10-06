import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  taskId: string;
}

/** `GET /projects/{projectId}/tasks/{taskId}/assignees` */
const taskAssigneeList: ActionDefinition<Input> = {
  key: "task-assignee-list",
  type: "search",
  resource: "task",
  title: "List Task Assignees",
  description: "List the people assigned to a task.",
  params: [{
    "key": "projectId",
    "label": "Project ID",
    "type": "string",
    "required": true,
    "hint": "A project id from List Folder Projects or List My Projects.",
  }, {
    "key": "taskId",
    "label": "Task ID",
    "type": "string",
    "required": true,
    "hint": "A task id from List Tasks.",
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
      `/projects/${seg(input.projectId)}/tasks/${seg(input.taskId)}/assignees`,
    );
    const items = Array.isArray(res.items) ? res.items : [];
    return { items, count: items.length };
  },
};

export default taskAssigneeList;
