import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient } from "../lib/client.ts";
import { extraFieldsParam, idParam } from "../lib/params.ts";

/** `PATCH /v3/tasks/{task_id}` — update an allocation. */
interface Input {
  task_id: number;
  startDate?: string;
  endDate?: string;
  hours?: number;
  notes?: string;
  status?: number;
  extraFields?: unknown;
}

const allocationUpdate: ActionDefinition<Input> = {
  key: "allocation-update",
  type: "perform",
  resource: "allocation",
  title: "Update Allocation",
  description: "Update an allocation's details. Only the fields provided are changed.",
  idempotent: true,
  params: [
    idParam("task_id", "Allocation ID"),
    { key: "startDate", label: "Start date", type: "date" },
    { key: "endDate", label: "End date", type: "date" },
    { key: "hours", label: "Hours per day", type: "number" },
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
    extraFieldsParam("Use it for `people_id`, `people_ids`, `project_id`, or repeat fields."),
  ],
  output: [
    { key: "task_id", type: "number", label: "Allocation ID" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const body = {
      ...compact({
        start_date: input.startDate,
        end_date: input.endDate,
        hours: input.hours,
        notes: input.notes,
        status: input.status,
      }),
      ...(extra ?? {}),
    };
    return await new FloatClient(ctx).json(`/tasks/${input.task_id}`, { method: "PATCH", body });
  },
};

export default allocationUpdate;
