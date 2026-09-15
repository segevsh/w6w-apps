import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient } from "../lib/client.ts";
import { extraFieldsParam } from "../lib/params.ts";

/**
 * `POST /v3/logged-time` — log time for a person.
 *
 * Two ways this breaks the pattern every other create action in this app
 * follows, both confirmed against the vendor's own Swagger document:
 *
 *  - **The success status is `200`, not `201`.** Every other Float create
 *    answers `201`; this one does not.
 *  - **The response body is an ARRAY of entries, not a single object** —
 *    `{"type": "array", "items": {"$ref": "#/definitions/LoggedTime"}}` is
 *    the documented `200` schema, even though the request creates exactly
 *    one entry.
 *
 * `0` hours is a valid, meaningful value: it soft-deletes an existing
 * matching entry rather than creating one, per the vendor's own field
 * description — this action does not special-case it, since that is Float's
 * documented behaviour, not an error.
 */
interface Input {
  peopleId: number;
  projectId: number;
  date: string;
  hours: number;
  phaseId?: number;
  taskId?: number;
  taskName?: string;
  notes?: string;
  referenceDate?: string;
  extraFields?: unknown;
}

const loggedTimeCreate: ActionDefinition<Input> = {
  key: "logged-time-create",
  type: "perform",
  resource: "logged-time",
  title: "Log Time",
  description:
    "Create a logged time entry. Answers 200 (not 201) with an ARRAY of entries. 403s with " +
    '"Time Tracking is not enabled for this team" if that feature is off.',
  idempotent: false,
  params: [
    {
      key: "peopleId",
      label: "Person ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    { key: "date", label: "Date", type: "date", required: true },
    {
      key: "hours",
      label: "Hours",
      type: "number",
      required: true,
      validation: { min: 0, max: 24 },
      hint: "Rounded to 2 decimal places by Float. `0` soft-deletes a matching existing entry " +
        "instead of creating a new one.",
    },
    { key: "phaseId", label: "Phase ID", type: "number", validation: { integer: true } },
    {
      key: "taskId",
      label: "Allocation ID",
      type: "number",
      validation: { integer: true },
      hint: "The scheduled allocation (task_id) this entry logs time against, if any.",
    },
    { key: "taskName", label: "Project task name", type: "string", validation: { maxLength: 150 } },
    { key: "notes", label: "Notes", type: "text", validation: { maxLength: 1500 } },
    {
      key: "referenceDate",
      label: "Reference date",
      type: "date",
      advanced: true,
      hint: "Suppresses a log-time suggestion for the matching allocation on this date in the UI.",
    },
    extraFieldsParam("Use it for `task_meta_id` or any field this form does not cover."),
  ],
  output: [
    {
      key: "entries",
      type: "array",
      label:
        "The created logged time entries — Float answers 200 with an array, not a single object",
    },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const body = {
      ...compact({
        people_id: input.peopleId,
        project_id: input.projectId,
        date: input.date,
        hours: input.hours,
        phase_id: input.phaseId,
        task_id: input.taskId,
        task_name: input.taskName,
        notes: input.notes,
        reference_date: input.referenceDate,
      }),
      ...(extra ?? {}),
    };
    const entries = await new FloatClient(ctx).json("/logged-time", { method: "POST", body });
    return { entries };
  },
};

export default loggedTimeCreate;
