import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /v3/tasks/{task_id}` — retrieve a single allocation. */
interface Input {
  task_id: number;
}

const allocationGet: ActionDefinition<Input> = {
  key: "allocation-get",
  type: "read",
  resource: "allocation",
  title: "Get Allocation",
  description: "Retrieve a single allocation by ID.",
  params: [idParam("task_id", "Allocation ID")],
  output: [
    { key: "task_id", type: "number", label: "Allocation ID" },
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "people_id", type: "number", label: "Person ID" },
  ],

  async execute(input, ctx) {
    return await new FloatClient(ctx).json(`/tasks/${input.task_id}`);
  },
};

export default allocationGet;
