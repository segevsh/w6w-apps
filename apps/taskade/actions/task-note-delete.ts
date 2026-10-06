import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  taskId: string;
}

/** `DELETE /projects/{projectId}/tasks/{taskId}/note` */
const taskNoteDelete: ActionDefinition<Input> = {
  key: "task-note-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task Note",
  description: "Delete a task's note.",
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
      `/projects/${seg(input.projectId)}/tasks/${seg(input.taskId)}/note`,
    );
    return { ok: true };
  },
};

export default taskNoteDelete;
