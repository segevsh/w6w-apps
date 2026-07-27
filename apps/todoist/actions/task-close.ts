import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

interface Input {
  taskId: string;
}

/**
 * POST /tasks/{id}/close — complete a task. For a recurring task this schedules
 * its next occurrence rather than removing it. Answers 204, so the action
 * reports `{ success: true }` rather than a body.
 */
const taskClose: ActionDefinition<Input> = {
  key: "task-close",
  type: "perform",
  resource: "task",
  title: "Close Task",
  description: "Mark a task as complete.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  async execute(input, ctx) {
    const client = new TodoistClient(ctx);
    await client.request(`/tasks/${encodeURIComponent(input.taskId)}/close`, { method: "POST" });
    return { success: true };
  },
};

export default taskClose;
