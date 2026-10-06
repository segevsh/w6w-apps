import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient } from "../lib/client.ts";

/**
 * `POST /v1/tasks/{taskId}/complete/` — Mark a task as completed.
 */
interface Input {
  taskId: string;
}

const taskComplete: ActionDefinition<Input, unknown> = {
  key: "task-complete",
  type: "perform",
  resource: "task",
  title: "Complete Task",
  description: "Mark a task as completed.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "`ok` when accepted" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/tasks/${encodeURIComponent(input.taskId)}/complete/`, {
      method: "POST",
    });
  },
};

export default taskComplete;
