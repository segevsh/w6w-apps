import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient, intBool } from "../lib/client.ts";
import { extraFieldsParam } from "../lib/params.ts";

/**
 * `POST /v3/people` — add a new person.
 *
 * Creating a person does NOT create an Account (that can only be done
 * through the Float UI). Each active person contributes to a billing seat.
 *
 * `role_id` takes priority over `job_title` when both are set: `job_title`
 * attempts to match an existing role by name and creates a new role if none
 * exists.
 */
interface Input {
  name: string;
  peopleCode?: string;
  email?: string;
  jobTitle?: string;
  roleId?: number;
  notes?: string;
  active?: boolean;
  employeeType?: boolean;
  peopleTypeId?: number;
  startDate?: string;
  endDate?: string;
  defaultHourlyRate?: string;
  extraFields?: unknown;
}

const personCreate: ActionDefinition<Input> = {
  key: "person-create",
  type: "perform",
  resource: "person",
  title: "Create Person",
  description: "Add a new person to the schedule.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 150 } },
    { key: "peopleCode", label: "People code", type: "string", validation: { maxLength: 32 } },
    { key: "email", label: "Email", type: "string", validation: { maxLength: 200 } },
    {
      key: "jobTitle",
      label: "Job title",
      type: "string",
      hint: "Ignored if Role ID is set; Role ID takes priority.",
    },
    { key: "roleId", label: "Role ID", type: "number", validation: { integer: true } },
    { key: "notes", label: "Notes", type: "text" },
    { key: "active", label: "Active", type: "boolean", default: true },
    {
      key: "employeeType",
      label: "Full-time",
      type: "boolean",
      default: true,
      hint: "Off means part-time.",
    },
    {
      key: "peopleTypeId",
      label: "People type",
      type: "select",
      default: 1,
      options: [
        { value: 1, label: "Employee" },
        { value: 2, label: "Contractor" },
        { value: 3, label: "Placeholder" },
        { value: 4, label: "Role placeholder" },
      ],
    },
    { key: "startDate", label: "Start date", type: "date" },
    { key: "endDate", label: "End date", type: "date" },
    {
      key: "defaultHourlyRate",
      label: "Default hourly rate",
      type: "string",
      hint: "Applied for fee-based projects using the 'Set same for everyone' billing option.",
    },
    extraFieldsParam(
      "Use it for fields this form does not cover, e.g. `department` (`{department_id}`), " +
        "`tags`, `work_days_hours`, `region_id`, `avatar_file`, or `cost_rate`.",
    ),
  ],
  output: [
    { key: "people_id", type: "number", label: "New person ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const body = {
      ...compact({
        name: input.name,
        people_code: input.peopleCode,
        email: input.email,
        job_title: input.jobTitle,
        role_id: input.roleId,
        notes: input.notes,
        active: intBool(input.active),
        employee_type: intBool(input.employeeType),
        people_type_id: input.peopleTypeId,
        start_date: input.startDate,
        end_date: input.endDate,
        default_hourly_rate: input.defaultHourlyRate,
      }),
      ...(extra ?? {}),
    };
    return await new FloatClient(ctx).json("/people", { method: "POST", body });
  },
};

export default personCreate;
