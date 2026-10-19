import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  taskId: string;
}

/** GET /v1/async_tasks/{task_id} — retrieve-async-task. */
const action: ActionDefinition<Input> = {
  key: "get-async-task",
  type: "read",
  resource: "asyncTask",
  title: "Get Async Task",
  description: "Retrieve an async task.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "status_url", "type": "string", "label": "Status url" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "operation", "type": "object", "label": "Operation" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "poll_after_seconds", "type": "number", "label": "Poll after seconds" },
    { "key": "result", "type": "object", "label": "Result" },
    { "key": "error", "type": "object", "label": "Error" },
  ],
  params: [{
    "key": "taskId",
    "label": "Task ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the async task to retrieve.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/async_tasks/${pathId(input.taskId)}`, {
      method: "GET",
    });
  },
};

export default action;
