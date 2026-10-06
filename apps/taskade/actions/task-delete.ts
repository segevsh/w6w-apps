import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  taskId: string;
}

/** `DELETE /projects/{projectId}/tasks/{taskId}` */
const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task from a project.",
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
      "key": "ok",
      "type": "boolean",
      "label": "Whether Taskade accepted the change",
    },
  ],

  async execute(input, ctx) {
    await new TaskadeClient(ctx).request<Record<string, unknown>>(
      "DELETE",
      `/projects/${seg(input.projectId)}/tasks/${seg(input.taskId)}`,
    );
    return { ok: true };
  },
};

export default taskDelete;
