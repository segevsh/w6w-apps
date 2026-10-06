import type { ActionDefinition } from "@w6w/types";
import { compact, enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  taskId: string;
  name?: string;
  description?: string;
  statusId?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  completionPercentage?: number;
  billingType?: string;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description:
    "Update a task's name, description, status, priority, dates, completion or billing type.",
  idempotent: true,
  params: [
    portalId,
    projectId,
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "From the List Tasks action.",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "statusId", label: "Status ID", type: "string" },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [{ value: "none", label: "None" }, { value: "low", label: "Low" }, {
        value: "medium",
        label: "Medium",
      }, { value: "high", label: "High" }],
    },
    {
      key: "startDate",
      label: "Start Date",
      type: "string",
      hint: "ISO 8601, e.g. 2026-10-06T09:00:00Z.",
    },
    {
      key: "endDate",
      label: "End Date",
      type: "string",
      hint: "ISO 8601, e.g. 2026-10-09T18:00:00Z.",
    },
    {
      key: "completionPercentage",
      label: "Completion %",
      type: "number",
      validation: { min: 0, max: 100, integer: true },
    },
    {
      key: "billingType",
      label: "Billing Type",
      type: "select",
      options: [{ value: "none", label: "None" }, { value: "billable", label: "Billable" }, {
        value: "non_billable",
        label: "Non-billable",
      }],
    },
  ],
  output: [{ key: "item", type: "object", label: "Resulting record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).request(
      "PATCH",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/tasks/${enc(input.taskId)}`,
      {
        body: compact({
          name: input.name,
          description: input.description,
          status: input.statusId ? { id: input.statusId } : undefined,
          priority: input.priority,
          start_date: input.startDate,
          end_date: input.endDate,
          completion_percentage: input.completionPercentage,
          billing_type: input.billingType,
        }),
      },
    );
    return { item: body };
  },
};

export default taskUpdate;
