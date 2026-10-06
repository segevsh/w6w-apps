import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { includeParam, resourceOutput } from "../lib/params.ts";

/**
 * Get one task list by id (`GET /task_lists/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  include?: string;
}

const tasklistGet: ActionDefinition<Input> = {
  key: "tasklist-get",
  type: "read",
  resource: "task_list",
  title: "Get Task List",
  description: "Get one task list by id (`GET /task_lists/{id}`).",
  params: [
    { key: "id", label: "Task list ID", type: "string", required: true },
    includeParam,
  ],
  output: resourceOutput("Task list"),

  async execute(input, ctx) {
    return await new ProductiveClient(ctx).one(`/task_lists/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
  },
};

export default tasklistGet;
