import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient, intBool } from "../lib/client.ts";
import { extraFieldsParam, idParam } from "../lib/params.ts";

/**
 * `PATCH /v3/people/{people_id}` — update a person's details.
 *
 * If `active` is changed to `0` (archived), Float revokes the person's
 * Account access by deleting it — that can only be re-established through
 * the UI, not this API.
 */
interface Input {
  people_id: number;
  name?: string;
  email?: string;
  jobTitle?: string;
  roleId?: number;
  notes?: string;
  active?: boolean;
  startDate?: string;
  endDate?: string;
  defaultHourlyRate?: string;
  extraFields?: unknown;
}

const personUpdate: ActionDefinition<Input> = {
  key: "person-update",
  type: "perform",
  resource: "person",
  title: "Update Person",
  description: "Update a person's details. Only the fields provided are changed.",
  idempotent: true,
  params: [
    idParam("people_id", "Person ID"),
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "roleId", label: "Role ID", type: "number", validation: { integer: true } },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "active",
      label: "Active",
      type: "boolean",
      hint: "Turning this off archives the person and revokes their Account access.",
    },
    { key: "startDate", label: "Start date", type: "date" },
    { key: "endDate", label: "End date", type: "date" },
    { key: "defaultHourlyRate", label: "Default hourly rate", type: "string" },
    extraFieldsParam("Use it for any field this form does not cover, including `cost_rate`."),
  ],
  output: [
    { key: "people_id", type: "number", label: "Person ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const body = {
      ...compact({
        name: input.name,
        email: input.email,
        job_title: input.jobTitle,
        role_id: input.roleId,
        notes: input.notes,
        active: intBool(input.active),
        start_date: input.startDate,
        end_date: input.endDate,
        default_hourly_rate: input.defaultHourlyRate,
      }),
      ...(extra ?? {}),
    };
    return await new FloatClient(ctx).json(`/people/${input.people_id}`, { method: "PATCH", body });
  },
};

export default personUpdate;
