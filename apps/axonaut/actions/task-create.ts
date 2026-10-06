import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, compact, toArray } from "../lib/client.ts";

/**
 * `POST /api/v2/tasks` — Create a task.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  title: string;
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

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true, hint: "Task title." },
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
    return new AxonautClient(ctx).one(`/tasks`, {
      method: "POST",
      body: compact({
        "title": input.title,
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

export default taskCreate;
