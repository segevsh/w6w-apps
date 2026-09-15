import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient, intBool } from "../lib/client.ts";
import { extraFieldsParam, idParam } from "../lib/params.ts";

/** `PATCH /v3/timeoffs/{timeoff_id}` — update a time off record. */
interface Input {
  timeoff_id: number;
  startDate?: string;
  endDate?: string;
  fullDay?: boolean;
  hours?: number;
  notes?: string;
  status?: number;
  extraFields?: unknown;
}

const timeoffUpdate: ActionDefinition<Input> = {
  key: "timeoff-update",
  type: "perform",
  resource: "timeoff",
  title: "Update Time Off",
  description: "Update a time off record's details. Only the fields provided are changed.",
  idempotent: true,
  params: [
    idParam("timeoff_id", "Time off ID"),
    { key: "startDate", label: "Start date", type: "date" },
    { key: "endDate", label: "End date", type: "date" },
    { key: "fullDay", label: "Full day", type: "boolean" },
    { key: "hours", label: "Hours per day", type: "number", validation: { min: 0, max: 24 } },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: 1, label: "Tentative" }, { value: 2, label: "Confirmed" }],
    },
    extraFieldsParam("Use it for `people_ids`, `timeoff_type_id`, or repeat fields."),
  ],
  output: [
    { key: "timeoff_id", type: "number", label: "Time off ID" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const body = {
      ...compact({
        start_date: input.startDate,
        end_date: input.endDate,
        full_day: intBool(input.fullDay),
        hours: input.hours,
        timeoff_notes: input.notes,
        status: input.status,
      }),
      ...(extra ?? {}),
    };
    return await new FloatClient(ctx).json(`/timeoffs/${input.timeoff_id}`, {
      method: "PATCH",
      body,
    });
  },
};

export default timeoffUpdate;
