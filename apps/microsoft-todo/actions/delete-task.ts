import type { ActionDefinition } from "@w6w/types";
import { GraphClient, taskPath } from "../lib/client.ts";
import { taskListParam, taskParam } from "../lib/params.ts";

interface Input {
  taskList: string;
  task: string;
}

/**
 * `DELETE /me/todo/lists/{todoTaskListId}/tasks/{todoTaskId}`
 * https://learn.microsoft.com/en-us/graph/api/todotask-delete?view=graph-rest-1.0
 *
 * Answers `204 No Content`, so this returns the status rather than a body.
 *
 * Deleting is not completing — a deleted task leaves no completion record, so a
 * workflow that wants an audit trail should use Complete Task instead.
 *
 * Least privileged permission: `Tasks.ReadWrite`.
 */
const deleteTask: ActionDefinition<Input> = {
  key: "delete-task",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task. Use Complete Task instead when the task was actually finished.",
  // The end state is the one the caller asked for either way.
  idempotent: true,
  params: [taskListParam, taskParam],
  output: [{ key: "status", type: "number", label: "HTTP status (204)" }],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.status(taskPath(input.taskList, input.task), { method: "DELETE" });
  },
};

export default deleteTask;
