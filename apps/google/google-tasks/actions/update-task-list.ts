import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoogleTasksClient } from "../lib/client.ts";

interface Input {
  taskList: string;
  title: string;
}

/**
 * `tasklists.patch` — PATCH /users/@me/lists/{tasklist}
 * https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/patch
 *
 * Patch semantics, so only the supplied fields change. `title` is the only
 * writable field on the resource, which is why it is required here rather than
 * optional — a patch with an empty body would be a no-op.
 */
const updateTaskList: ActionDefinition<Input> = {
  key: "update-task-list",
  type: "perform",
  resource: "taskList",
  title: "Update Task List",
  description: "Rename a task list (patch semantics — `title` is its only writable field).",
  // Re-sending the same title lands the list in the same state.
  idempotent: true,
  params: [
    {
      key: "taskList",
      label: "Task list ID",
      type: "string",
      required: true,
      hint: "From `list-task-lists`.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint: "Maximum 1024 characters.",
      validation: { maxLength: 1024 },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task list ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "updated", type: "string", label: "Last modified (RFC 3339)" },
  ],

  execute(input, ctx) {
    const client = new GoogleTasksClient(ctx);
    return client.request(`/users/@me/lists/${encodeId(input.taskList)}`, {
      method: "PATCH",
      body: { title: input.title },
    });
  },
};

export default updateTaskList;
