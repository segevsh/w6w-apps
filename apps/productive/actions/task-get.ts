import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { includeParam, resourceOutput } from "../lib/params.ts";

/**
 * Get one task by id (`GET /tasks/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  include?: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Get one task by id (`GET /tasks/{id}`).",
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    includeParam,
  ],
  output: resourceOutput("Task"),

  async execute(input, ctx) {
    return await new ProductiveClient(ctx).one(`/tasks/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
  },
};

export default taskGet;
