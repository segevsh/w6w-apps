import type { ActionDefinition } from "@w6w/types";
import { compact, idRef, PrintavoClient } from "../lib/client.ts";
import { TASK_FIELDS } from "../lib/fields.ts";

interface Input {
  name: string;
  dueAt: string;
  assignedToId?: string;
  completed?: boolean;
  taskableId?: string;
  taskableType?: string;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description:
    "Create a task, optionally attached to a quote, invoice or customer (taskCreate). Name and due date are required by the API.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "dueAt", label: "Due", type: "string", required: true, hint: "ISO 8601 datetime." },
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
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ taskCreate: unknown }>(
      `mutation($input: TaskCreateInput!) { taskCreate(input: $input) { ${TASK_FIELDS} } }`,
      {
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
    return data.taskCreate;
  },
};

export default taskCreate;
