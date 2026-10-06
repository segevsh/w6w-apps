import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  taskId: string;
  value: string;
  type?: string;
}

/** `PUT /projects/{projectId}/tasks/{taskId}/note` */
const taskNoteSet: ActionDefinition<Input> = {
  key: "task-note-set",
  type: "perform",
  resource: "task",
  title: "Set Task Note",
  description: "Replace a task's note.",
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
  }, {
    "key": "value",
    "label": "Note",
    "type": "text",
    "required": true,
  }, {
    "key": "type",
    "label": "Note format",
    "type": "select",
    "default": "text/markdown",
    "options": [
      {
        "value": "text/markdown",
        "label": "Markdown",
      },
      {
        "value": "text/plain",
        "label": "Plain text",
      },
    ],
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
      "PUT",
      `/projects/${seg(input.projectId)}/tasks/${seg(input.taskId)}/note`,
      { body: { type: input.type ?? "text/markdown", value: input.value } },
    );
    return { item: res.item ?? null };
  },
};

export default taskNoteSet;
