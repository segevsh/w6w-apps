import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoogleTasksClient } from "../lib/client.ts";

interface Input {
  taskList: string;
  task: string;
}

/**
 * `tasks.delete` — DELETE /lists/{tasklist}/tasks/{task}
 * https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/delete
 *
 * Google documents an empty response body, so the client normalises it to
 * `undefined` and we return a `{ success: true }` sentinel instead.
 */
const deleteTask: ActionDefinition<Input, { success: true }> = {
  key: "delete-task",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task from a task list.",
  // Deleting an already-deleted task is a 404, but the end state is the same.
  idempotent: true,
  params: [
    { key: "taskList", label: "Task list ID", type: "string", required: true },
    { key: "task", label: "Task ID", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new GoogleTasksClient(ctx);
    await client.request<void>(
      `/lists/${encodeId(input.taskList)}/tasks/${encodeId(input.task)}`,
      { method: "DELETE" },
    );
    return { success: true };
  },
};

export default deleteTask;
