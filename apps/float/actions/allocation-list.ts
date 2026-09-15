import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { fieldsParam, modifiedSinceParam, paginationParams, sortParam } from "../lib/params.ts";

/**
 * `GET /v3/tasks` — list allocations.
 *
 * Float's API calls a scheduled allocation a `task` — a naming collision
 * with Project Tasks (`task_meta_id`, the reusable label an allocation
 * points at). This app spells the resource "allocation" throughout to keep
 * the two apart; `task_meta_id` still appears as a field name because that
 * is what the API itself calls it.
 *
 * Repeating allocations are also returned if their `repeat_end_date` falls
 * within the requested date range, per the vendor's own note.
 */
interface Input {
  client_id?: number;
  project_id?: number;
  phase_id?: number;
  task_meta_id?: number;
  people_id?: number;
  start_date?: string;
  end_date?: string;
  billable?: number;
  status?: number;
  page?: number;
  "per-page"?: number;
  sort?: string;
  modified_since?: string;
  fields?: string;
}

const allocationList: ActionDefinition<Input> = {
  key: "allocation-list",
  type: "read",
  resource: "allocation",
  title: "List Allocations",
  description: "List scheduled allocations (called `tasks` in Float's own API).",
  params: [
    { key: "client_id", label: "Client ID", type: "number", validation: { integer: true } },
    { key: "project_id", label: "Project ID", type: "number", validation: { integer: true } },
    { key: "phase_id", label: "Phase ID", type: "number", validation: { integer: true } },
    {
      key: "task_meta_id",
      label: "Project task ID",
      type: "number",
      validation: { integer: true },
      hint: "The project task (task_meta_id) this allocation is labeled with.",
    },
    { key: "people_id", label: "Person ID", type: "number", validation: { integer: true } },
    { key: "start_date", label: "Start date", type: "date" },
    {
      key: "end_date",
      label: "End date",
      type: "date",
      hint: "Must be used together with Start date. Inclusive of any repeat_end_date.",
    },
    {
      key: "billable",
      label: "Billable",
      type: "select",
      options: [{ value: 1, label: "Billable" }, { value: 0, label: "Non-billable" }],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: 1, label: "Tentative" },
        { value: 2, label: "Confirmed" },
        { value: 3, label: "Complete" },
      ],
    },
    ...paginationParams(),
    sortParam,
    modifiedSinceParam,
    fieldsParam,
  ],
  output: [
    { key: "task_id", type: "number", label: "Allocation ID" },
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "people_id", type: "number", label: "Person ID" },
    { key: "start_date", type: "string", label: "Start date" },
    { key: "end_date", type: "string", label: "End date" },
    { key: "hours", type: "number", label: "Hours per day" },
  ],

  async execute(input, ctx) {
    const { items, pagination } = await new FloatClient(ctx).list("/tasks", {
      client_id: input.client_id,
      project_id: input.project_id,
      phase_id: input.phase_id,
      task_meta_id: input.task_meta_id,
      people_id: input.people_id,
      start_date: input.start_date,
      end_date: input.end_date,
      billable: input.billable,
      status: input.status,
      page: input.page,
      "per-page": input["per-page"],
      sort: input.sort,
      modified_since: input.modified_since,
      fields: input.fields,
    });
    return { items, pagination };
  },
};

export default allocationList;
