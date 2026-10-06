import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  taskId: string;
  content: string;
  contentType?: string;
}

/** `PUT /projects/{projectId}/tasks/{taskId}` */
const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Replace a task's text.",
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
    "key": "content",
    "label": "Content",
    "type": "text",
    "required": true,
  }, {
    "key": "contentType",
    "label": "Content type",
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
      `/projects/${seg(input.projectId)}/tasks/${seg(input.taskId)}`,
      { body: { contentType: input.contentType ?? "text/markdown", content: input.content } },
    );
    return { item: res.item ?? null };
  },
};

export default taskUpdate;
