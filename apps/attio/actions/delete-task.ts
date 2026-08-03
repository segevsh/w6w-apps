import type { ActionDefinition } from "@w6w/types";
import { AttioClient } from "../lib/client.ts";

interface Input {
  taskId: string;
}

/**
 * `DELETE /v2/tasks/{task_id}` — remove a task.
 *
 * Permanent; tasks have no archived state. This is also the only way to change a
 * task's text, since Update Task cannot touch `content` — delete and recreate.
 *
 * The response is `200` with an empty object; `deleted: true` below is this
 * action's summary of a successful call, not a field Attio returned.
 */
const deleteTask: ActionDefinition<Input> = {
  key: "delete-task",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  idempotent: true,
  description:
    "Permanently delete a task. Also the only way to correct a task's text, since its content " +
    "cannot be updated.",
  params: [
    {
      key: "taskId",
      label: "Task id",
      type: "string",
      required: true,
      placeholder: "649e34f4-c39a-4f4d-99ef-48a36bef8f04",
      hint: "UUID of the task. There is no undo.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when Attio accepted the delete" },
    { key: "task_id", type: "string", label: "The id that was deleted" },
  ],

  async execute(input, ctx) {
    await new AttioClient(ctx).request(`/tasks/${encodeURIComponent(input.taskId)}`, {
      method: "DELETE",
    });
    return { deleted: true, task_id: input.taskId };
  },
};

export default deleteTask;
