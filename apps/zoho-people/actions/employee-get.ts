import type { ActionDefinition } from "@w6w/types";
import { flattenBulkRecords } from "../lib/client.ts";
import { peopleGet } from "../lib/people.ts";

interface Input {
  identifier: string;
  identifierType?: "email" | "employeeId";
}

const employeeGet: ActionDefinition<Input> = {
  key: "employee-get",
  type: "read",
  resource: "employee",
  title: "Get Employee",
  description:
    "Look up one employee record (with tabular sections) by email address or Employee ID, via the `employee` form.",
  params: [
    {
      key: "identifier",
      label: "Email or Employee ID",
      type: "string",
      required: true,
    },
    {
      key: "identifierType",
      label: "Identifier type",
      type: "select",
      default: "email",
      options: [
        { value: "email", label: "Email address" },
        { value: "employeeId", label: "Employee ID" },
      ],
    },
  ],
  output: [
    { key: "employee", type: "object", label: "The employee record, or null if none matched" },
    { key: "recordId", type: "string", label: "Zoho record id" },
  ],

  async execute(input, ctx) {
    const column = (input.identifierType ?? "email") === "employeeId"
      ? "EMPLOYEEID"
      : "EMPLOYEEMAILALIAS";
    const { result } = await peopleGet(ctx, "/forms/employee/getRecords", {
      searchColumn: column,
      searchValue: input.identifier,
    });
    const employee = flattenBulkRecords(result)[0] ?? null;
    return { employee, recordId: (employee?.recordId as string | undefined) ?? null };
  },
};

export default employeeGet;
