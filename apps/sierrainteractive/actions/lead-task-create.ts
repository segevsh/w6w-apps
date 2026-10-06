import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, SierraClient } from "../lib/client.ts";

interface Input {
  leadIdOrEmail: string;
  description: string;
  dueDate?: string;
  type?: string;
  taskType?: number;
}

/**
 * `POST /zapier/leads/{leadIdOrEmail}/createTask` — body `ZapierTaskReqModel`
 * `{description, dueDate, type, taskType}`. `type` is a free string and `taskType` an integer
 * enum 0-4; the Swagger document does not say how they relate, so both are offered and only
 * the ones set are sent. List Task Types shows the names.
 */
const leadTaskCreate: ActionDefinition<Input> = {
  key: "lead-task-create",
  type: "perform",
  resource: "task",
  title: "Create Lead Task",
  description: "Create a follow-up task on a lead.",
  idempotent: false,
  params: [
    { key: "leadIdOrEmail", label: "Lead ID or email", type: "string", required: true },
    { key: "description", label: "Description", type: "text", required: true },
    { key: "dueDate", label: "Due date", type: "string", hint: "A date or date-time string." },
    { key: "type", label: "Task type name", type: "string", hint: "A name from List Task Types." },
    {
      key: "taskType",
      label: "Task type code",
      type: "select",
      options: [0, 1, 2, 3, 4].map((v) => ({ value: v, label: String(v) })),
      hint: "Numeric task type (0-4) as defined in Sierra's schema.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Sierra's response" }],

  async execute(input, ctx) {
    return await new SierraClient(ctx).request(
      "POST",
      `/zapier/leads/${encodeId(input.leadIdOrEmail)}/createTask`,
      compact({
        description: input.description,
        dueDate: input.dueDate,
        type: input.type,
        taskType: input.taskType === undefined || input.taskType === null
          ? undefined
          : Number(input.taskType),
      }),
    );
  },
};

export default leadTaskCreate;
