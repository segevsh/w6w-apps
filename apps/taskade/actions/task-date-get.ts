import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  taskId: string;
}

/** `GET /projects/{projectId}/tasks/{taskId}/date` */
const taskDateGet: ActionDefinition<Input> = {
  key: "task-date-get",
  type: "read",
  resource: "task",
  title: "Get Task Date",
  description: "Read a task's due date or date range.",
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
      "key": "item",
      "type": "object",
      "label": "The resource Taskade returned",
    },
  ],

  async execute(input, ctx) {
    const res = await new TaskadeClient(ctx).request<Record<string, unknown>>(
      "GET",
      `/projects/${seg(input.projectId)}/tasks/${seg(input.taskId)}/date`,
    );
    return { item: res.item ?? null };
  },
};

export default taskDateGet;
