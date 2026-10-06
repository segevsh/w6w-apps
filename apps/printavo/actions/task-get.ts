import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";
import { TASK_FIELDS } from "../lib/fields.ts";

interface Input {
  id: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch one task by ID.",
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<Record<string, unknown>>(
      `query($id: ID!) { task(id: $id) { ${TASK_FIELDS} } }`,
      { id: input.id },
    );
    return data.task;
  },
};

export default taskGet;
