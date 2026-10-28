import type { ActionDefinition } from "@w6w/types";
import { compact, enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  name: string;
  tasklistId?: string;
  parentTaskId?: string;
  ownerZpuids?: string[];
  description?: string;
  statusId?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  completionPercentage?: number;
  billingType?: string;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description:
    "Create a task (or a subtask when a parent task is given). With no task list the general task list is used.",
  idempotent: false,
  params: [
    portalId,
    projectId,
    { key: "name", label: "Name", type: "string", required: true },
    { key: "tasklistId", label: "Task List ID", type: "string" },
    {
      key: "parentTaskId",
      label: "Parent Task ID",
      type: "string",
      hint: "Create this task as a subtask of the given task.",
    },
    {
      key: "ownerZpuids",
      label: "Owner ZPUIDs",
      type: "json",
      hint: 'JSON array of ZPUID strings to assign, e.g. ["4000000002055"].',
    },
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
      "POST",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/tasks`,
      {
        body: compact({
          name: input.name,
          tasklist: input.tasklistId ? { id: input.tasklistId } : undefined,
          parental_info: input.parentTaskId ? { parent_task_id: input.parentTaskId } : undefined,
          description: input.description,
          status: input.statusId ? { id: input.statusId } : undefined,
          priority: input.priority,
          start_date: input.startDate,
          end_date: input.endDate,
          completion_percentage: input.completionPercentage,
          billing_type: input.billingType,
          owners_and_work: input.ownerZpuids?.length
            ? { owners: input.ownerZpuids.map((zpuid) => ({ zpuid })) }
            : undefined,
        }),
      },
    );
    return { item: body };
  },
};

export default taskCreate;
