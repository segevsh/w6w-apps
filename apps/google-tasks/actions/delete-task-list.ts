import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoogleTasksClient } from "../lib/client.ts";

interface Input {
  taskList: string;
}

/**
 * `tasklists.delete` — DELETE /users/@me/lists/{tasklist}
 * https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/delete
 *
 * Google documents an empty response body, so the client normalises it to
 * `undefined` and we return a `{ success: true }` sentinel instead.
 */
const deleteTaskList: ActionDefinition<Input, { success: true }> = {
  key: "delete-task-list",
  type: "perform",
  resource: "taskList",
  title: "Delete Task List",
  description: "Delete a task list and every task in it.",
  // Deleting an already-deleted list is a 404, but the end state is the same.
  idempotent: true,
  params: [
    {
      key: "taskList",
      label: "Task list ID",
      type: "string",
      required: true,
      hint: "Deletes the list and all of its tasks. This cannot be undone.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new GoogleTasksClient(ctx);
    await client.request<void>(`/users/@me/lists/${encodeId(input.taskList)}`, {
      method: "DELETE",
    });
    return { success: true };
  },
};

export default deleteTaskList;
