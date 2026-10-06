import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  taskId: string;
  targetTaskId: string;
  position: string;
}

/** `PUT /projects/{projectId}/tasks/{taskId}/move` */
const taskMove: ActionDefinition<Input> = {
  key: "task-move",
  type: "perform",
  resource: "task",
  title: "Move Task",
  description: "Move a task relative to another task in the same project.",
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
    "key": "targetTaskId",
    "label": "Target task ID",
    "type": "string",
    "required": true,
  }, {
    "key": "position",
    "label": "Position",
    "type": "select",
    "required": true,
    "options": [
      {
        "value": "beforebegin",
        "label": "Before the target task",
      },
      {
        "value": "afterbegin",
        "label": "First child of the target task",
      },
      {
        "value": "beforeend",
        "label": "Last child of the target task",
      },
      {
        "value": "afterend",
        "label": "After the target task",
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
      `/projects/${seg(input.projectId)}/tasks/${seg(input.taskId)}/move`,
      { body: { target: { taskId: input.targetTaskId, position: input.position } } },
    );
    return { item: res.item ?? null };
  },
};

export default taskMove;
