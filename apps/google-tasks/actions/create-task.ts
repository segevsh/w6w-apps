import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoogleTasksClient } from "../lib/client.ts";

interface Input {
  taskList: string;
  title: string;
  notes?: string;
  due?: string;
  status?: "needsAction" | "completed";
  completed?: string;
  parent?: string;
  previous?: string;
}

interface TaskPayload {
  title: string;
  notes?: string;
  due?: string;
  status?: string;
  completed?: string;
}

/**
 * `tasks.insert` — POST /lists/{tasklist}/tasks
 * https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/insert
 *
 * Placement is a *query* concern, not a body one: `parent` is `readOnly` on the
 * Task schema, so nesting a subtask is `?parent=<taskId>` and ordering is
 * `?previous=<siblingId>`. Sending either in the body would be silently ignored.
 */
const createTask: ActionDefinition<Input> = {
  key: "create-task",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task in a task list, optionally nested under a parent or after a sibling.",
  // Google issues a fresh task id per call, so a retry creates a duplicate.
  idempotent: false,
  params: [
    { key: "taskList", label: "Task list ID", type: "string", required: true },
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint: "Maximum 1024 characters.",
      validation: { maxLength: 1024 },
    },
    {
      key: "notes",
      label: "Notes",
      type: "text",
      hint: "Maximum 8192 characters.",
      validation: { maxLength: 8192 },
    },
    {
      key: "due",
      label: "Due date (RFC 3339)",
      type: "datetime",
      hint: "Google records only the date portion — a time of day cannot be set through the API.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "needsAction", label: "Needs action" },
        { value: "completed", label: "Completed" },
      ],
    },
    {
      key: "completed",
      label: "Completion date (RFC 3339)",
      type: "datetime",
      hint: "Only meaningful together with status `completed`.",
    },
    {
      key: "parent",
      label: "Parent task ID",
      type: "string",
      hint: "Set to create a subtask. Omit for a top-level task.",
    },
    {
      key: "previous",
      label: "Previous sibling task ID",
      type: "string",
      hint: "The task to place this one after. Omit to place it first.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "position", type: "string", label: "Position among siblings" },
    { key: "webViewLink", type: "string", label: "Link to the task in Google Tasks" },
  ],

  execute(input, ctx) {
    const client = new GoogleTasksClient(ctx);
    const body: TaskPayload = { title: input.title };
    if (input.notes !== undefined) body.notes = input.notes;
    if (input.due !== undefined) body.due = input.due;
    if (input.status !== undefined) body.status = input.status;
    if (input.completed !== undefined) body.completed = input.completed;

    return client.request(`/lists/${encodeId(input.taskList)}/tasks`, {
      method: "POST",
      body,
      query: { parent: input.parent, previous: input.previous },
    });
  },
};

export default createTask;
