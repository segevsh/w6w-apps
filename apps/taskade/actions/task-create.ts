import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  content: string;
  contentType?: string;
  placement?: string;
  referenceTaskId?: string;
}

/** `POST /projects/{projectId}/tasks/` */
const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task in a project (up to 2000 characters of content).",
  idempotent: false,
  params: [{
    "key": "projectId",
    "label": "Project ID",
    "type": "string",
    "required": true,
    "hint": "A project id from List Folder Projects or List My Projects.",
  }, {
    "key": "content",
    "label": "Content",
    "type": "text",
    "required": true,
    "hint": "Task text, at most 2000 characters.",
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
  }, {
    "key": "placement",
    "label": "Placement",
    "type": "select",
    "default": "beforeend",
    "options": [
      {
        "value": "beforeend",
        "label": "Last child of the reference task, or end of the project",
      },
      {
        "value": "afterbegin",
        "label": "First child of the reference task, or start of the project",
      },
      {
        "value": "beforebegin",
        "label": "Before the reference task (needs a reference)",
      },
      {
        "value": "afterend",
        "label": "After the reference task (needs a reference)",
      },
    ],
  }, {
    "key": "referenceTaskId",
    "label": "Reference task ID",
    "type": "string",
    "hint": "Position the new task relative to this task. Omit to place it at the project root.",
  }],
  output: [
    {
      "key": "tasks",
      "type": "array",
      "label": "Created tasks",
    },
    {
      "key": "task",
      "type": "object",
      "label": "The created task (id, text, parentId, completed)",
    },
  ],

  async execute(input, ctx) {
    if (
      !input.referenceTaskId &&
      (input.placement === "beforebegin" || input.placement === "afterend")
    ) {
      throw new Error("Placement before/after needs a Reference task ID");
    }
    const placement = input.placement ?? "beforeend";
    const entry = {
      contentType: input.contentType ?? "text/markdown",
      content: input.content,
      placement,
      ...(input.referenceTaskId ? { taskId: input.referenceTaskId } : {}),
    };
    const res = await new TaskadeClient(ctx).request<{ item?: unknown[] }>(
      "POST",
      `/projects/${seg(input.projectId)}/tasks/`,
      { body: { tasks: [entry] } },
    );
    const tasks = Array.isArray(res.item) ? res.item : [];
    return { tasks, task: tasks[0] ?? null };
  },
};

export default taskCreate;
