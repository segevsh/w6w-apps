import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task (taskDelete).",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Deleted ID" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<Record<string, { id: string }>>(
      `mutation($id: ID!) { taskDelete(id: $id) { id } }`,
      { id: input.id },
    );
    return data.taskDelete;
  },
};

export default taskDelete;
