import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient } from "../lib/client.ts";
import { extraFieldsParam, idParam } from "../lib/params.ts";

/** `PATCH /v3/milestones/{milestone_id}` — update a milestone. */
interface Input {
  milestone_id: number;
  name?: string;
  date?: string;
  endDate?: string;
  extraFields?: unknown;
}

const milestoneUpdate: ActionDefinition<Input> = {
  key: "milestone-update",
  type: "perform",
  resource: "milestone",
  title: "Update Milestone",
  description: "Update a milestone's details. Only the fields provided are changed.",
  idempotent: true,
  params: [
    idParam("milestone_id", "Milestone ID"),
    { key: "name", label: "Name", type: "string" },
    {
      key: "date",
      label: "Start date/time",
      type: "string",
      placeholder: "2025-12-01 09:00",
      hint: "Float's own `YYYY-MM-DD HH:mm` format, not a plain date.",
    },
    { key: "endDate", label: "End date/time", type: "string", placeholder: "2025-12-05 17:00" },
    extraFieldsParam("Use it for `project_id` or `phase_id`."),
  ],
  output: [
    { key: "milestone_id", type: "number", label: "Milestone ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const body = {
      ...compact({ name: input.name, date: input.date, end_date: input.endDate }),
      ...(extra ?? {}),
    };
    return await new FloatClient(ctx).json(`/milestones/${input.milestone_id}`, {
      method: "PATCH",
      body,
    });
  },
};

export default milestoneUpdate;
