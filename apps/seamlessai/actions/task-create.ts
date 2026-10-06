import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, toInt } from "../lib/client.ts";

/** `POST /api/client/v2/tasks` — Create Task. */
interface Input {
  name: string;
  taskType: string;
  contactId: number;
  dueAt?: string;
  description?: string;
  priority?: number;
  templateId?: number;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task against a contact.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "taskType",
      label: "Task type",
      type: "select",
      required: true,
      options: [
        { value: "email", label: "email" },
        { value: "auto-email", label: "auto-email" },
        { value: "manual-email", label: "manual-email" },
        { value: "bulkEmail", label: "bulkEmail" },
        { value: "call", label: "call" },
        { value: "linkedIn", label: "linkedIn" },
        { value: "linkedin-message", label: "linkedin-message" },
        { value: "linkedin-connect-request", label: "linkedin-connect-request" },
        { value: "custom", label: "custom" },
        { value: "default", label: "default" },
      ],
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "Integer contact ID from contacts-list.",
    },
    { key: "dueAt", label: "Due at", type: "datetime", hint: "ISO 8601." },
    { key: "description", label: "Description", type: "text" },
    { key: "priority", label: "Priority", type: "number", validation: { integer: true } },
    { key: "templateId", label: "Template ID", type: "number", validation: { integer: true } },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "The record" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("POST", "/tasks", {
      body: compact({
        name: need(input.name, "Name"),
        taskType: need(input.taskType, "Task type"),
        contactId: need(toInt(input.contactId, "Contact ID"), "Contact ID"),
        dueAt: input.dueAt,
        description: input.description,
        priority: toInt(input.priority, "Priority"),
        templateId: toInt(input.templateId, "Template ID"),
      }),
    });
  },
};

export default taskCreate;
