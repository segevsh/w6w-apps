import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoogleTasksClient } from "../lib/client.ts";

interface Input {
  taskList: string;
}

/**
 * `tasks.clear` — POST /lists/{tasklist}/clear
 * https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/clear
 *
 * Marks every completed task in the list as *hidden*, which is what the "Delete
 * completed tasks" button in the Google Tasks UI does. Hidden tasks are not
 * deleted — they keep their ids and come back from `list-tasks` with
 * `showHidden: true`.
 *
 * Empty request body, empty response body; the client normalises the latter to
 * `undefined`, so we return a `{ success: true }` sentinel.
 */
const clearCompletedTasks: ActionDefinition<Input, { success: true }> = {
  key: "clear-completed-tasks",
  type: "perform",
  resource: "task",
  title: "Clear Completed Tasks",
  description:
    "Hide every completed task in a task list. Hidden tasks still exist — list them with `showHidden`.",
  // Clearing a list twice leaves the same set of tasks hidden.
  idempotent: true,
  params: [
    { key: "taskList", label: "Task list ID", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Cleared" }],

  async execute(input, ctx) {
    const client = new GoogleTasksClient(ctx);
    await client.request<void>(`/lists/${encodeId(input.taskList)}/clear`, {
      method: "POST",
    });
    return { success: true };
  },
};

export default clearCompletedTasks;
