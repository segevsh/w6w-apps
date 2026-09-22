import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `DELETE /v1.0/tasks/{taskId}` — delete a task.
 *
 * The caller must have manage permission on the task's lead. The response body
 * is empty, so the id and HTTP status are returned.
 *
 * Idempotent in the sense the runtime cares about: one call and five leave the
 * same task gone. A repeat call against an id that no longer exists surfaces
 * Lofty's error rather than being swallowed, because that usually means the
 * wrong id rather than that the work was already done.
 */
interface Input {
  taskId: number;
}

const action: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task by id (DELETE /v1.0/tasks/{taskId}).",
  idempotent: true,
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "number",
      required: true,
      hint: "The `taskId` from a List Tasks result.",
    },
  ],
  output: [
    { key: "taskId", type: "number", label: "Deleted task ID" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new LoftyClient(ctx).status(`/tasks/${input.taskId}`, {
      method: "DELETE",
    });
    return { taskId: input.taskId, status };
  },
};

export default action;
