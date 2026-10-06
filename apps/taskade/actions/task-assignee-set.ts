import type { ActionDefinition } from "@w6w/types";
import { seg, strList, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  taskId: string;
  handles: string;
}

/** `PUT /projects/{projectId}/tasks/{taskId}/assignees` */
const taskAssigneeSet: ActionDefinition<Input> = {
  key: "task-assignee-set",
  type: "perform",
  resource: "task",
  title: "Set Task Assignees",
  description: "Replace a task's assignees with the given user handles.",
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
    "key": "handles",
    "label": "Assignee handles",
    "type": "string",
    "required": true,
    "hint": "Comma-separated Taskade user handles (from List Project Members).",
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
      `/projects/${seg(input.projectId)}/tasks/${seg(input.taskId)}/assignees`,
      { body: { handles: strList(input.handles) } },
    );
    return { item: res.item ?? null };
  },
};

export default taskAssigneeSet;
