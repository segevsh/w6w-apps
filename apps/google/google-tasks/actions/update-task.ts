import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoogleTasksClient } from "../lib/client.ts";

interface Input {
  taskList: string;
  task: string;
  title?: string;
  notes?: string;
  due?: string;
  status?: "needsAction" | "completed";
  completed?: string;
  deleted?: boolean;
}

/**
 * `tasks.patch` — PATCH /lists/{tasklist}/tasks/{task}
 * https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/patch
 *
 * Patch (not PUT) semantics, so an omitted field is left alone rather than
 * cleared. `parent` and `position` are `readOnly` on the Task schema and so are
 * absent here — reordering and re-nesting go through `move-task`.
 *
 * Setting `status` back to `needsAction` is how a task is reopened.
 */
const updateTask: ActionDefinition<Input> = {
  key: "update-task",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description:
    "Update a task's writable fields (patch semantics — omitted fields are left unchanged). Set status to `needsAction` to reopen a completed task.",
  // The same patch applied twice leaves the task in the same state.
  idempotent: true,
  params: [
    { key: "taskList", label: "Task list ID", type: "string", required: true },
    { key: "task", label: "Task ID", type: "string", required: true },
    {
      key: "title",
      label: "Title",
      type: "string",
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
      hint: "Google records only the date portion.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "needsAction", label: "Needs action (reopen)" },
        { value: "completed", label: "Completed" },
      ],
    },
    { key: "completed", label: "Completion date (RFC 3339)", type: "datetime" },
    { key: "deleted", label: "Deleted", type: "boolean", hint: "Flag the task as deleted." },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "updated", type: "string", label: "Last modified (RFC 3339)" },
  ],

  execute(input, ctx) {
    const client = new GoogleTasksClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body.title = input.title;
    if (input.notes !== undefined) body.notes = input.notes;
    if (input.due !== undefined) body.due = input.due;
    if (input.status !== undefined) body.status = input.status;
    if (input.completed !== undefined) body.completed = input.completed;
    if (input.deleted !== undefined) body.deleted = input.deleted;

    return client.request(
      `/lists/${encodeId(input.taskList)}/tasks/${encodeId(input.task)}`,
      { method: "PATCH", body },
    );
  },
};

export default updateTask;
