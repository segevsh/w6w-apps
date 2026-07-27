import type { ActionDefinition } from "@w6w/types";
import { ClickUpClient } from "../lib/client.ts";

interface Input {
  taskId: string;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Permanently delete a task.",
  // Deleting an already-deleted task 404s, but the end state is the same.
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new ClickUpClient(ctx).request(
      `/task/${encodeURIComponent(input.taskId)}`,
      { method: "DELETE" },
    );
    return { success: true };
  },
};

export default taskDelete;
