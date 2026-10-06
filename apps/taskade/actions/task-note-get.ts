import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  taskId: string;
}

/** `GET /projects/{projectId}/tasks/{taskId}/note` */
const taskNoteGet: ActionDefinition<Input> = {
  key: "task-note-get",
  type: "read",
  resource: "task",
  title: "Get Task Note",
  description: "Read a task's note.",
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
      `/projects/${seg(input.projectId)}/tasks/${seg(input.taskId)}/note`,
    );
    return { item: res.item ?? null };
  },
};

export default taskNoteGet;
