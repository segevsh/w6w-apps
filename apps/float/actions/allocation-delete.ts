import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /v3/tasks/{task_id}` — delete an allocation. */
interface Input {
  task_id: number;
}

const allocationDelete: ActionDefinition<Input> = {
  key: "allocation-delete",
  type: "perform",
  resource: "allocation",
  title: "Delete Allocation",
  description: "Delete an allocation.",
  idempotent: true,
  params: [idParam("task_id", "Allocation ID")],
  output: [],

  async execute(input, ctx) {
    await new FloatClient(ctx).remove(`/tasks/${input.task_id}`);
    return { deleted: true, task_id: input.task_id };
  },
};

export default allocationDelete;
