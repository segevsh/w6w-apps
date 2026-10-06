import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, encodeId } from "../lib/client.ts";

/**
 * `GET /api/v2/employees/{employeeId}` — Get one employee by id.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  employeeId: number;
}

const employeeGet: ActionDefinition<Input> = {
  key: "employee-get",
  type: "read",
  resource: "employee",
  title: "Get Employee",
  description: "Get one employee by id.",
  params: [
    {
      key: "employeeId",
      label: "Employee ID",
      type: "number",
      required: true,
      hint: "Numeric Axonaut id of the employee.",
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
    return new AxonautClient(ctx).one(`/employees/${encodeId(input.employeeId)}`);
  },
};

export default employeeGet;
