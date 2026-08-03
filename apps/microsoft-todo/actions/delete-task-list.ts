import type { ActionDefinition } from "@w6w/types";
import { encodeId, GraphClient } from "../lib/client.ts";
import { taskListParam } from "../lib/params.ts";

interface Input {
  taskList: string;
}

/**
 * `DELETE /me/todo/lists/{todoTaskListId}`
 * https://learn.microsoft.com/en-us/graph/api/todotasklist-delete?view=graph-rest-1.0
 *
 * Deletes the list **and every task in it**, and Microsoft documents no undo
 * path for it. The built-in Tasks and Flagged email lists cannot be deleted.
 *
 * Answers `204 No Content`, so this returns the status rather than a body.
 *
 * Least privileged permission: `Tasks.ReadWrite`.
 */
const deleteTaskList: ActionDefinition<Input> = {
  key: "delete-task-list",
  type: "perform",
  resource: "task-list",
  title: "Delete Task List",
  description:
    "Delete a To Do list and every task in it. The built-in Tasks and Flagged email lists cannot be deleted.",
  // Re-deleting a gone list 404s, but the end state is the same one the caller
  // asked for, so a retry is safe.
  idempotent: true,
  params: [taskListParam],
  output: [{ key: "status", type: "number", label: "HTTP status (204)" }],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.status(`/me/todo/lists/${encodeId(input.taskList)}`, { method: "DELETE" });
  },
};

export default deleteTaskList;
