import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

interface Input {
  taskId: string;
}

/**
 * POST /tasks/{id}/reopen — un-complete a task, restoring it to the active
 * list (and any completed ancestors along with it). Answers 204.
 */
const taskReopen: ActionDefinition<Input> = {
  key: "task-reopen",
  type: "perform",
  resource: "task",
  title: "Reopen Task",
  description: "Reopen a previously completed task.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  async execute(input, ctx) {
    const client = new TodoistClient(ctx);
    await client.request(`/tasks/${encodeURIComponent(input.taskId)}/reopen`, { method: "POST" });
    return { success: true };
  },
};

export default taskReopen;
