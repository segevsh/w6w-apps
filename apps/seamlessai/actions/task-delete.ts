import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient, segment } from "../lib/client.ts";

/** `DELETE /api/client/v2/tasks/{id}` — Delete Task. */
interface Input {
  id: string;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "Task ID from the matching list action.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request(
      "DELETE",
      `/tasks/${segment(input.id, "Task ID")}`,
    );
  },
};

export default taskDelete;
