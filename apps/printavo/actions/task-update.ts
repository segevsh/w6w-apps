import type { ActionDefinition } from "@w6w/types";
import { compact, idRef, PrintavoClient } from "../lib/client.ts";
import { TASK_FIELDS } from "../lib/fields.ts";

interface Input {
  id: string;
  name?: string;
  dueAt?: string;
  assignedToId?: string;
  completed?: boolean;
  taskableId?: string;
  taskableType?: string;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description:
    "Update a task, e.g. mark it completed (taskUpdate); only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "dueAt", label: "Due", type: "string", hint: "ISO 8601 datetime." },
    { key: "assignedToId", label: "Assigned To User ID", type: "string" },
    { key: "completed", label: "Completed", type: "boolean" },
    {
      key: "taskableId",
      label: "Attach To ID",
      type: "string",
      hint: "ID of the quote, invoice or customer (needs Attach To Type).",
    },
    {
      key: "taskableType",
      label: "Attach To Type",
      type: "select",
      options: [{ label: "Quote", value: "QUOTE" }, { label: "Invoice", value: "INVOICE" }, {
        label: "Customer",
        value: "CUSTOMER",
      }],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "completed", type: "boolean", label: "Completed" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ taskUpdate: unknown }>(
      `mutation($id: ID!, $input: TaskInput!) { taskUpdate(id: $id, input: $input) { ${TASK_FIELDS} } }`,
      {
        id: input.id,
        input: compact({
          name: input.name,
          dueAt: input.dueAt,
          completed: input.completed,
          assignedTo: idRef(input.assignedToId),
          taskable: input.taskableId && input.taskableType
            ? { id: input.taskableId, type: input.taskableType }
            : undefined,
        }),
      },
    );
    return data.taskUpdate;
  },
};

export default taskUpdate;
