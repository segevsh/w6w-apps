import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

interface Input {
  taskId: string;
}

/** GET /tasks/{id} — fetch a single active task by id. */
const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Retrieve a single active task by its id.",
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "content", type: "string", label: "Content" },
  ],

  execute(input, ctx) {
    const client = new TodoistClient(ctx);
    return client.request(`/tasks/${encodeURIComponent(input.taskId)}`);
  },
};

export default taskGet;
