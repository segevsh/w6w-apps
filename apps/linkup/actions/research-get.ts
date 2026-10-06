import type { ActionDefinition } from "@w6w/types";
import { encodeId, LinkupClient } from "../lib/client.ts";

const researchGet: ActionDefinition<{ id: string }, Record<string, unknown>> = {
  key: "research-get",
  type: "read",
  resource: "research",
  title: "Get Research Task",
  description: "Read one research task. Once completed, `output` holds the answer and sources.",
  params: [{ key: "id", label: "Task id", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Task id" },
    { key: "status", type: "string", label: "pending, processing, completed or failed" },
    { key: "error", type: "string", label: "Failure message, if failed" },
    { key: "output", type: "object", label: "The sourced answer or structured data" },
    { key: "task", type: "object", label: "The task as returned by Linkup" },
  ],

  async execute(input, ctx) {
    const task = await new LinkupClient(ctx).get<Record<string, unknown>>(
      `/v1/research/${encodeId(input.id)}`,
    );
    return { id: task?.id, status: task?.status, error: task?.error, output: task?.output, task };
  },
};

export default researchGet;
