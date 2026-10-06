import type { ActionDefinition } from "@w6w/types";
import { need, RunwayClient } from "../lib/client.ts";

interface Input {
  taskId: string;
}

/**
 * `DELETE /v1/tasks/{id}` — 204. A PENDING, THROTTLED or RUNNING task is cancelled; any other
 * task is DELETED (its output is removed per the vendor's retention policy). Same call, so the
 * action is named for both.
 */
const cancelTask: ActionDefinition<Input> = {
  key: "cancel-task",
  type: "perform",
  idempotent: true,
  resource: "task",
  title: "Cancel or Delete Task",
  description: "Cancel a pending, throttled or running task; for a finished task, delete it " +
    "and its output.",
  params: [{ key: "taskId", label: "Task ID", type: "string", required: true }],
  output: [{ key: "taskId", type: "string", label: "The task acted on" }],

  async execute(input, ctx) {
    const taskId = need(input.taskId, "taskId");
    await new RunwayClient(ctx).request(`/v1/tasks/${encodeURIComponent(taskId)}`, {
      method: "DELETE",
    });
    return { taskId };
  },
};

export default cancelTask;
