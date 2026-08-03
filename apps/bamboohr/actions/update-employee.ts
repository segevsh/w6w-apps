import type { ActionDefinition } from "@w6w/types";
import { BambooClient, withFields } from "../lib/client.ts";

interface Input {
  id: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string;
  jobTitle?: string;
  department?: string;
  fields?: Record<string, unknown>;
}

/**
 * `POST /api/v1/employees/{id}` — update an employee's fields.
 *
 * Note the method: BambooHR updates with **POST**, not PUT or PATCH, and the
 * semantics are a merge — "Update an employee's fields by submitting a JSON
 * object ... containing field name/value pairs". Only the keys present are
 * touched, which is why `compact` (via `withFields`) drops `undefined` rather
 * than sending nulls: an unfilled optional form field must not blank a stored
 * value.
 *
 * `idempotent: true` — applying the same field/value pairs twice leaves the
 * record in the same state, and there is no create-on-write behaviour to
 * duplicate. Retrying is safe.
 *
 * Address aliases are a documented trap and the docs call it out field by field:
 * the correct keys are `address1`, `address2`, `city`, `state`, `zipcode`,
 * `country` — NOT `homeAddress1`, `homeCity`, `homeState`, `homeZipcode` or
 * `homeCountry`. A wrong alias is a 406 ("The request contains references to
 * non-existent fields"), so the `fields` hint names the right ones.
 *
 * Like create, photo keys are silently ignored here.
 */
const updateEmployee: ActionDefinition<Input> = {
  key: "update-employee",
  type: "perform",
  resource: "employee",
  title: "Update Employee",
  description:
    "Update fields on an existing employee. Only the fields you supply are changed; everything " +
    "else is left alone.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Employee ID",
      type: "string",
      required: true,
      hint: "The INTERNAL employee ID, not the editable Employee # on the profile.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "workEmail", label: "Work email", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "department", label: "Department", type: "string" },
    {
      key: "fields",
      label: "Additional fields",
      type: "json",
      hint: 'JSON object of any other writable employee fields, e.g. `{"city": "Austin"}`. Home ' +
        "address aliases are `address1`, `address2`, `city`, `state`, `zipcode`, `country` — the " +
        "`home*` variants do not exist and return a 406. Discover names with List Fields.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (200 on success)" }],

  async execute(input, ctx) {
    const body = withFields({
      firstName: input.firstName,
      lastName: input.lastName,
      workEmail: input.workEmail,
      jobTitle: input.jobTitle,
      department: input.department,
    }, input.fields);

    await new BambooClient(ctx).request(`/employees/${encodeURIComponent(input.id)}`, {
      method: "POST",
      body,
    });
    return { status: 200 };
  },
};

export default updateEmployee;
