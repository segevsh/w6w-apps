import type { ActionDefinition } from "@w6w/types";
import { call, encodeId } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/** `GET /v2/tasks/{task_id}` (Mem API v2). */
type Input = Record<string, unknown>;

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch one task.",
  params: [
    str("task_id", "Task ID", { required: true }),
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "status", type: "string", label: "pending, in_progress, completed or canceled" },
    { key: "due_at", type: "string", label: "Due, or null" },
    { key: "project_id", type: "string", label: "Project ID, or null" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],

  execute(input, ctx) {
    return call(ctx, "GET", `/v2/tasks/${encodeId(input.task_id)}`);
  },
};

export default taskGet;
