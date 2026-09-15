import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient, intBool } from "../lib/client.ts";
import { extraFieldsParam, repeatEndDateParam, repeatStateParam } from "../lib/params.ts";

/** `POST /v3/timeoffs` — add a new time off record. */
interface Input {
  timeoffTypeId: number;
  peopleIds: number[] | string;
  startDate: string;
  endDate: string;
  fullDay?: boolean;
  hours?: number;
  startTime?: string;
  notes?: string;
  status?: number;
  repeat_state?: number;
  repeat_end_date?: string;
  extraFields?: unknown;
}

const timeoffCreate: ActionDefinition<Input> = {
  key: "timeoff-create",
  type: "perform",
  resource: "timeoff",
  title: "Create Time Off",
  description: "Add a new time off record for one or more people.",
  idempotent: false,
  params: [
    {
      key: "timeoffTypeId",
      label: "Time off type ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      key: "peopleIds",
      label: "People IDs",
      type: "array",
      required: true,
      item: { type: "number" },
      hint: "One or more people IDs this time off applies to.",
    },
    { key: "startDate", label: "Start date", type: "date", required: true },
    { key: "endDate", label: "End date", type: "date", required: true },
    { key: "fullDay", label: "Full day", type: "boolean", default: true },
    {
      key: "hours",
      label: "Hours per day",
      type: "number",
      hint: "Not required for a full day.",
      validation: { min: 0, max: 24 },
    },
    { key: "startTime", label: "Start time (24hr)", type: "string", placeholder: "14:00" },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: 2,
      options: [{ value: 1, label: "Tentative" }, { value: 2, label: "Confirmed" }],
    },
    repeatStateParam,
    repeatEndDateParam,
    extraFieldsParam("Use it for any field this form does not cover."),
  ],
  output: [
    { key: "timeoff_id", type: "number", label: "New time off ID" },
    { key: "people_ids", type: "array", label: "People assigned" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const peopleIds = Array.isArray(input.peopleIds)
      ? input.peopleIds
      : String(input.peopleIds).split(",").map((s) => Number(s.trim())).filter((n) =>
        Number.isFinite(n)
      );
    const body = {
      ...compact({
        timeoff_type_id: input.timeoffTypeId,
        people_ids: peopleIds,
        start_date: input.startDate,
        end_date: input.endDate,
        full_day: intBool(input.fullDay),
        hours: input.hours,
        start_time: input.startTime,
        timeoff_notes: input.notes,
        status: input.status,
        repeat_state: input.repeat_state,
        repeat_end: input.repeat_end_date,
      }),
      ...(extra ?? {}),
    };
    return await new FloatClient(ctx).json("/timeoffs", { method: "POST", body });
  },
};

export default timeoffCreate;
