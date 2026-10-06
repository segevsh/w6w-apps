import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  taskId: string;
}

/** `POST /projects/{projectId}/tasks/{taskId}/complete` */
const taskComplete: ActionDefinition<Input> = {
  key: "task-complete",
  type: "perform",
  resource: "task",
  title: "Complete Task",
  description: "Mark a task completed.",
  idempotent: true,
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
      "POST",
      `/projects/${seg(input.projectId)}/tasks/${seg(input.taskId)}/complete`,
    );
    return { item: res.item ?? null };
  },
};

export default taskComplete;
