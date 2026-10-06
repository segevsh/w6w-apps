import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient } from "../lib/client.ts";

/**
 * `GET /v1/tasks/{taskId}/` — Get one task by id.
 */
interface Input {
  taskId: string;
}

const taskGet: ActionDefinition<Input, unknown> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Get one task by id.",
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Record id" },
    { key: "url", type: "string", label: "Record URL" },
    { key: "name", type: "string", label: "Task name" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/tasks/${encodeURIComponent(input.taskId)}/`, { method: "GET" });
  },
};

export default taskGet;
