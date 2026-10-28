import type { ActionDefinition } from "@w6w/types";
import type { ZohoRecordResult } from "../lib/client.ts";
import { crmCreate } from "../lib/crm.ts";
import { writeOutput } from "../lib/params.ts";

interface Input {
  subject: string;
  dueDate?: string;
  status?: string;
  priority?: string;
  description?: string;
  whoId?: string;
  whatId?: string;
  relatedModule?: string;
}

const taskCreate: ActionDefinition<Input, ZohoRecordResult> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description:
    "Create a Task in the Tasks module. `Subject` is Zoho's only system-mandatory field.",
  idempotent: false,
  params: [
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "dueDate", label: "Due date", type: "date" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Not Started", label: "Not Started" },
        { value: "In Progress", label: "In Progress" },
        { value: "Completed", label: "Completed" },
        { value: "Waiting for input", label: "Waiting for input" },
        { value: "Deferred", label: "Deferred" },
      ],
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "High", label: "High" },
        { value: "Normal", label: "Normal" },
        { value: "Low", label: "Low" },
      ],
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "whoId",
      label: "Related Lead/Contact ID",
      type: "string",
      hint: "Sets `Who_Id` — the Lead or Contact this Task is about.",
    },
    {
      key: "whatId",
      label: "Related record ID",
      type: "string",
      hint: "Sets `What_Id` — e.g. a Deal or Account id. Requires `relatedModule`.",
    },
    {
      key: "relatedModule",
      label: "Related record module",
      type: "string",
      placeholder: "Deals",
      hint: "The module `whatId` belongs to (sets `$se_module`). Required when `whatId` is set.",
    },
  ],
  output: writeOutput,

  execute(input, ctx) {
    return crmCreate(ctx, "Tasks", {
      fields: {
        Subject: input.subject,
        Due_Date: input.dueDate,
        Status: input.status,
        Priority: input.priority,
        Description: input.description,
        ...(input.whoId ? { Who_Id: { id: input.whoId } } : {}),
        ...(input.whatId ? { What_Id: { id: input.whatId }, $se_module: input.relatedModule } : {}),
      },
    });
  },
};

export default taskCreate;
