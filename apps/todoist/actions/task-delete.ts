import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

interface Input {
  taskId: string;
}

/**
 * DELETE /tasks/{id} — permanently delete a task and its sub-tasks. Answers
 * 204, so the action reports `{ success: true }` rather than a body.
 */
const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Permanently delete a task.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  async execute(input, ctx) {
    const client = new TodoistClient(ctx);
    await client.request(`/tasks/${encodeURIComponent(input.taskId)}`, { method: "DELETE" });
    return { success: true };
  },
};

export default taskDelete;
