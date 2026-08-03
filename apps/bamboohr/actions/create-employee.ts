import type { ActionDefinition } from "@w6w/types";
import { BambooClient, withFields } from "../lib/client.ts";

interface Input {
  firstName: string;
  lastName: string;
  workEmail?: string;
  jobTitle?: string;
  department?: string;
  hireDate?: string;
  fields?: Record<string, unknown>;
}

/**
 * `POST /api/v1/employees` — create an employee.
 *
 * The documented request schema is deliberately short: "At minimum, provide a
 * first name and last name in a JSON object ... The request body schema lists
 * commonly used fields, but **any valid writable employee field name may be
 * included as a key**." The six named params are exactly that documented common
 * set (`firstName`, `lastName`, `workEmail`, `jobTitle`, `department`,
 * `hireDate`); everything else rides in the free-form `fields` map, because the
 * real field set is per-company (custom fields exist) and cannot be enumerated
 * in a manifest.
 *
 * `idempotent: false`, and not as a formality. BambooHR has no idempotency key
 * on this endpoint, and the only duplicate protection it documents is on email:
 * "409 Conflict — The request attempts to create a duplicate. For employees,
 * duplicate emails are not allowed." A retry without `workEmail` set therefore
 * creates a second person.
 *
 * Two documented non-behaviours, surfaced because both fail SILENTLY:
 *  - Photo keys are ignored. "Photo-related keys (e.g. `photo`, `photoUrl`)
 *    included in the body are silently ignored: the request still creates the
 *    employee and returns 201, but no photo is attached."
 *  - The response body is not the employee. BambooHR returns 201 with the new
 *    record's location; read it back with Get Employee if you need fields.
 */
const createEmployee: ActionDefinition<Input> = {
  key: "create-employee",
  type: "perform",
  resource: "employee",
  title: "Create Employee",
  description:
    "Create a new employee. First and last name are the only required fields; any other writable " +
    "employee field may be supplied via Additional fields.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    {
      key: "workEmail",
      label: "Work email",
      type: "string",
      hint:
        "Duplicate emails are rejected with a 409, which is the only duplicate protection this " +
        "endpoint has — worth setting if a retry might repeat.",
    },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "department", label: "Department", type: "string" },
    {
      key: "hireDate",
      label: "Hire date",
      type: "date",
      hint: "YYYY-MM-DD.",
    },
    {
      key: "fields",
      label: "Additional fields",
      type: "json",
      hint: 'JSON object of any other writable employee fields, e.g. `{"division": "West", ' +
        '"customStartDate": "2026-09-01"}`. Discover valid names with the List Fields action. ' +
        "Photo fields are silently ignored by this endpoint.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (201 on success)" }],

  async execute(input, ctx) {
    const body = withFields({
      firstName: input.firstName,
      lastName: input.lastName,
      workEmail: input.workEmail,
      jobTitle: input.jobTitle,
      department: input.department,
      hireDate: input.hireDate,
    }, input.fields);

    await new BambooClient(ctx).request("/employees", { method: "POST", body });
    return { status: 201 };
  },
};

export default createEmployee;
