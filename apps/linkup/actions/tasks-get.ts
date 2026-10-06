import type { ActionDefinition } from "@w6w/types";
import { encodeId, LinkupClient } from "../lib/client.ts";

const tasksGet: ActionDefinition<{ id: string }, Record<string, unknown>> = {
  key: "tasks-get",
  type: "read",
  resource: "tasks",
  title: "Get Task",
  description: "Read one asynchronous task (search, fetch, research or extract) by id.",
  params: [{ key: "id", label: "Task id", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Task id" },
    { key: "type", type: "string", label: "search, fetch, research or extract" },
    { key: "status", type: "string", label: "pending, processing, completed or failed" },
    { key: "error", type: "string", label: "Failure message, if failed" },
    { key: "output", type: "object", label: "The result, once completed" },
    { key: "task", type: "object", label: "The task as returned by Linkup" },
  ],

  async execute(input, ctx) {
    const task = await new LinkupClient(ctx).get<Record<string, unknown>>(
      `/v1/tasks/${encodeId(input.id)}`,
    );
    return {
      id: task?.id,
      type: task?.type,
      status: task?.status,
      error: task?.error,
      output: task?.output,
      task,
    };
  },
};

export default tasksGet;
