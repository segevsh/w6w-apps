import type { ActionDefinition } from "@w6w/types";
import { compact, SeamlessClient, segment, toInt } from "../lib/client.ts";

/** `PUT /api/client/v2/tasks/{id}` — Update Task. */
interface Input {
  id: string;
  name?: string;
  dueAt?: string;
  description?: string;
  priority?: number;
  status?: string;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Change a task's name, due date, description, priority or status.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "Task ID from the matching list action.",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "dueAt", label: "Due at", type: "datetime", hint: "ISO 8601." },
    { key: "description", label: "Description", type: "text" },
    { key: "priority", label: "Priority", type: "number", validation: { integer: true } },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "DRAFT", label: "DRAFT" },
        { value: "TODO", label: "TODO" },
        { value: "QUEUED", label: "QUEUED" },
        { value: "SCHEDULED", label: "SCHEDULED" },
        { value: "STARTED", label: "STARTED" },
        { value: "RETRYING", label: "RETRYING" },
        { value: "PAUSED", label: "PAUSED" },
        { value: "COMPLETED", label: "COMPLETED" },
        { value: "PASTDUE", label: "PASTDUE" },
        { value: "ARCHIVED", label: "ARCHIVED" },
        { value: "ERROR", label: "ERROR" },
        { value: "CANCELED", label: "CANCELED" },
        { value: "SKIPPED", label: "SKIPPED" },
        { value: "DUE_TODAY", label: "DUE_TODAY" },
        { value: "DELETED", label: "DELETED" },
      ],
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "The record" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("PUT", `/tasks/${segment(input.id, "Task ID")}`, {
      body: compact({
        name: input.name,
        dueAt: input.dueAt,
        description: input.description,
        priority: toInt(input.priority, "Priority"),
        status: input.status,
      }),
    });
  },
};

export default taskUpdate;
