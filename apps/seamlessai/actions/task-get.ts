import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient, segment } from "../lib/client.ts";

/** `GET /api/client/v2/tasks/{id}` — Get Task. */
interface Input {
  id: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Get one task.",
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
    { key: "data", type: "object", label: "The record" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("GET", `/tasks/${segment(input.id, "Task ID")}`);
  },
};

export default taskGet;
