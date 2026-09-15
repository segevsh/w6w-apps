import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient } from "../lib/client.ts";
import { extraFieldsParam, repeatEndDateParam, repeatStateParam } from "../lib/params.ts";

/**
 * `POST /v3/tasks` — add a new allocation.
 *
 * Assign ONE person with `peopleId`, or several with `peopleIds` (via
 * Additional fields) — the vendor ignores `people_id` when `people_ids` is
 * also set.
 */
interface Input {
  projectId: number;
  peopleId?: number;
  phaseId?: number;
  startDate: string;
  endDate: string;
  hours: number;
  startTime?: string;
  name?: string;
  taskMetaId?: number;
  notes?: string;
  status?: number;
  repeat_state?: number;
  repeat_end_date?: string;
  extraFields?: unknown;
}

const allocationCreate: ActionDefinition<Input> = {
  key: "allocation-create",
  type: "perform",
  resource: "allocation",
  title: "Create Allocation",
  description: "Add a new scheduled allocation (called a `task` in Float's own API).",
  idempotent: false,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      key: "peopleId",
      label: "Person ID",
      type: "number",
      validation: { integer: true },
      hint:
        "Omit this and use `peopleIds` (via Additional fields) to assign several people at once.",
    },
    { key: "phaseId", label: "Phase ID", type: "number", validation: { integer: true } },
    { key: "startDate", label: "Start date", type: "date", required: true },
    { key: "endDate", label: "End date", type: "date", required: true },
    { key: "hours", label: "Hours per day", type: "number", required: true },
    { key: "startTime", label: "Start time (24hr)", type: "string", placeholder: "14:00" },
    {
      key: "name",
      label: "Task name",
      type: "string",
      hint: "Name of the associated project task. Ignored if Project task ID (taskMetaId, via " +
        "Additional fields) is set — that takes priority.",
    },
    { key: "taskMetaId", label: "Project task ID", type: "number", validation: { integer: true } },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: 0, label: "Draft" },
        { value: 1, label: "Tentative" },
        { value: 2, label: "Confirmed" },
        { value: 3, label: "Complete" },
        { value: 4, label: "Canceled" },
      ],
    },
    repeatStateParam,
    repeatEndDateParam,
    extraFieldsParam(
      "Use it for `people_ids` (assign several people at once) or `parent_task_id`.",
    ),
  ],
  output: [
    { key: "task_id", type: "number", label: "New allocation ID" },
    { key: "project_id", type: "number", label: "Project ID" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const body = {
      ...compact({
        project_id: input.projectId,
        people_id: input.peopleId,
        phase_id: input.phaseId,
        start_date: input.startDate,
        end_date: input.endDate,
        hours: input.hours,
        start_time: input.startTime,
        name: input.name,
        task_meta_id: input.taskMetaId,
        notes: input.notes,
        status: input.status,
        repeat_state: input.repeat_state,
        repeat_end_date: input.repeat_end_date,
      }),
      ...(extra ?? {}),
    };
    return await new FloatClient(ctx).json("/tasks", { method: "POST", body });
  },
};

export default allocationCreate;
