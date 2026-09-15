import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient } from "../lib/client.ts";
import { extraFieldsParam } from "../lib/params.ts";

/**
 * `POST /v3/milestones` — add a new project milestone.
 *
 * `date` (and `end_date`, for a multi-day milestone) are Float's own
 * `YYYY-MM-DD HH:mm` datetime strings, not plain dates — e.g.
 * `2019-12-01 09:00`.
 */
interface Input {
  name: string;
  projectId: number;
  phaseId?: number;
  date: string;
  endDate?: string;
  extraFields?: unknown;
}

const milestoneCreate: ActionDefinition<Input> = {
  key: "milestone-create",
  type: "perform",
  resource: "milestone",
  title: "Create Milestone",
  description: "Add a new milestone to a project.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 200 } },
    {
      key: "projectId",
      label: "Project ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    { key: "phaseId", label: "Phase ID", type: "number", validation: { integer: true } },
    {
      key: "date",
      label: "Start date/time",
      type: "string",
      required: true,
      placeholder: "2025-12-01 09:00",
      hint: "Float's own `YYYY-MM-DD HH:mm` format, not a plain date.",
    },
    {
      key: "endDate",
      label: "End date/time",
      type: "string",
      placeholder: "2025-12-05 17:00",
      hint:
        "Only needed for a milestone spanning more than one day. Same format as Start date/time.",
    },
    extraFieldsParam("Use it for any field this form does not cover."),
  ],
  output: [
    { key: "milestone_id", type: "number", label: "New milestone ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const body = {
      ...compact({
        name: input.name,
        project_id: input.projectId,
        phase_id: input.phaseId,
        date: input.date,
        end_date: input.endDate,
      }),
      ...(extra ?? {}),
    };
    return await new FloatClient(ctx).json("/milestones", { method: "POST", body });
  },
};

export default milestoneCreate;
