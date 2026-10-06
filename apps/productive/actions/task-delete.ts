import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { deleteOutput } from "../lib/params.ts";

/**
 * Delete a task (`DELETE /tasks/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task (`DELETE /tasks/{id}`).",
  idempotent: true,
  params: [{ key: "id", label: "Task ID", type: "string", required: true }],
  output: deleteOutput,

  execute(input, ctx) {
    return new ProductiveClient(ctx).remove(`/tasks/${encodeId(input.id)}`, input.id);
  },
};

export default taskDelete;
