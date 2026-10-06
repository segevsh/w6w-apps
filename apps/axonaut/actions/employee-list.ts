import type { ActionDefinition } from "@w6w/types";
import { AxonautClient } from "../lib/client.ts";

/**
 * `GET /api/v2/employees` — List contacts (employees), optionally filtered; pass a company id to list one company.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  page?: number;
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
}

const employeeList: ActionDefinition<Input> = {
  key: "employee-list",
  type: "search",
  resource: "employee",
  title: "List Employees",
  description:
    "List contacts (employees), optionally filtered; pass a company id to list one company.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint:
        "Page number, sent as the `page` header (1-based). The list ends at the first empty page.",
    },
    { key: "email", label: "Email", type: "string", hint: "Email filter." },
    { key: "firstname", label: "First name", type: "string", hint: "First name filter." },
    { key: "lastname", label: "Last name", type: "string", hint: "Last name filter." },
    { key: "phone", label: "Phone", type: "string", hint: "Phone filter." },
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "count", type: "number", label: "Records on this page" },
    { key: "page", type: "number", label: "Page requested" },
    { key: "nextPage", type: "number", label: "Next page number, null when this page was empty" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).many(`/employees`, {
      query: {
        "email": input.email,
        "firstname": input.firstname,
        "lastname": input.lastname,
        "phone": input.phone,
      },
      page: input.page,
    });
  },
};

export default employeeList;
