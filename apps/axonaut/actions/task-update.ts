import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, compact, encodeId, toArray } from "../lib/client.ts";

/**
 * `PATCH /api/v2/tasks/{taskId}` — Update a task; only the fields you send change.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  taskId: number;
  title?: string;
  priority?: string;
  task_status_id?: number;
  description?: string;
  estimated_workload?: number;
  task_nature_id?: number;
  company_id?: number;
  project_id?: number;
  start_date?: string;
  end_date?: string;
  estimated_end_date?: string;
  workforces_id?: string | Record<string, unknown> | unknown[];
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task; only the fields you send change.",
  idempotent: true,
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "number",
      required: true,
      hint: "Numeric Axonaut id of the task.",
    },
    { key: "title", label: "Title", type: "string", hint: "Task title." },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [{ value: "basse", label: "basse" }, { value: "normale", label: "normale" }, {
        value: "haute",
        label: "haute",
      }, { value: "urgente", label: "urgente" }],
      hint: "Task priority.",
    },
    {
      key: "task_status_id",
      label: "Task status ID",
      type: "number",
      hint: "Status id (see task statuses).",
    },
    { key: "description", label: "Description", type: "string", hint: "Task description." },
    {
      key: "estimated_workload",
      label: "Estimated workload",
      type: "number",
      hint: "Estimated workload.",
    },
    {
      key: "task_nature_id",
      label: "Task nature ID",
      type: "number",
      hint: "Task nature id (see task natures).",
    },
    { key: "company_id", label: "Company ID", type: "number", hint: "Company id." },
    { key: "project_id", label: "Project ID", type: "number", hint: "Project id." },
    {
      key: "start_date",
      label: "Start date",
      type: "string",
      hint: "Start date as used by Axonaut, e.g. `25/04/2023`.",
    },
    { key: "end_date", label: "End date", type: "string", hint: "End date." },
    {
      key: "estimated_end_date",
      label: "Estimated end date",
      type: "string",
      hint: "Estimated end date.",
    },
    {
      key: "workforces_id",
      label: "Workforce IDs",
      type: "json",
      hint: "JSON array of workforce ids.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "priority", type: "string", label: "Priority" },
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "company_id", type: "number", label: "Company ID" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/tasks/${encodeId(input.taskId)}`, {
      method: "PATCH",
      body: compact({
        "title": input.title,
        "priority": input.priority,
        "task_status_id": input.task_status_id,
        "description": input.description,
        "estimated_workload": input.estimated_workload,
        "task_nature_id": input.task_nature_id,
        "company_id": input.company_id,
        "project_id": input.project_id,
        "start_date": input.start_date,
        "end_date": input.end_date,
        "estimated_end_date": input.estimated_end_date,
        "workforces_id": toArray(input.workforces_id, "workforces_id"),
      }),
    });
  },
};

export default taskUpdate;
