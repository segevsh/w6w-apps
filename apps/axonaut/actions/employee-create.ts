import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, compact, toObject } from "../lib/client.ts";

/**
 * `POST /api/v2/employees` — Create an employee (contact) on a company.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  company_id: number;
  gender?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone_number?: string;
  cellphone_number?: string;
  custom_fields?: string | Record<string, unknown> | unknown[];
  is_billing_contact?: boolean;
}

const employeeCreate: ActionDefinition<Input> = {
  key: "employee-create",
  type: "perform",
  resource: "employee",
  title: "Create Employee",
  description: "Create an employee (contact) on a company.",
  idempotent: false,
  params: [
    {
      key: "company_id",
      label: "Company ID",
      type: "number",
      required: true,
      hint: "Company the employee belongs to.",
    },
    {
      key: "gender",
      label: "Gender",
      type: "select",
      options: [{ value: "1", label: "1" }, { value: "2", label: "2" }],
      hint: "1 or 2, as defined by Axonaut.",
    },
    { key: "firstname", label: "First name", type: "string", hint: "First name." },
    { key: "lastname", label: "Last name", type: "string", hint: "Last name." },
    { key: "email", label: "Email", type: "string", hint: "Email." },
    { key: "phone_number", label: "Phone", type: "string", hint: "Phone number." },
    { key: "cellphone_number", label: "Mobile", type: "string", hint: "Mobile number." },
    {
      key: "custom_fields",
      label: "Custom fields",
      type: "json",
      hint: 'JSON object `{"customFieldName": value}`.',
    },
    {
      key: "is_billing_contact",
      label: "Billing contact",
      type: "boolean",
      hint: "Mark as billing contact.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Employee ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "company_id", type: "number", label: "Company ID" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/employees`, {
      method: "POST",
      body: compact({
        "company_id": input.company_id,
        "gender": input.gender === undefined ? undefined : Number(input.gender),
        "firstname": input.firstname,
        "lastname": input.lastname,
        "email": input.email,
        "phone_number": input.phone_number,
        "cellphone_number": input.cellphone_number,
        "custom_fields": toObject(input.custom_fields, "custom_fields"),
        "is_billing_contact": input.is_billing_contact,
      }),
    });
  },
};

export default employeeCreate;
