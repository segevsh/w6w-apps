import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /tasks/{taskId}/estimate` — Remove a task's estimate.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  taskId: string;
}

const taskEstimateDelete: ActionDefinition<Input> = {
  key: "task-estimate-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task Estimate",
  description: "Remove a task's estimate.",
  idempotent: true,
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "Everhour task id, e.g. `ev:3000010034` (or `{platform}:{id}`).",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/tasks/${encodeId(input.taskId)}/estimate`, {
      method: "DELETE",
    });
  },
};

export default taskEstimateDelete;
