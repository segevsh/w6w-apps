import type { ActionDefinition } from "@w6w/types";
import { HoneyBookClient } from "../lib/client.ts";

interface Input {
  employeeIds: string;
}

const projectPayrollEmployeeCountsGet: ActionDefinition<Input> = {
  key: "project-payroll-employee-counts-get",
  type: "read",
  resource: "project",
  title: "Get Project Counts per Payroll Employee",
  description: "Project counts per payroll employee (batch).",
  params: [
    {
      key: "employeeIds",
      label: "Employee IDs",
      type: "string",
      required: true,
      hint: "Comma-separated payroll employee ids.",
    },
  ],
  output: [
    { key: "employee_id", type: "string", label: "Employee id" },
    { key: "project_count", type: "number", label: "Project count" },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request(
      "GET",
      `/projects/payroll_employee_counts`,
      {
        query: {
          employee_ids: input.employeeIds,
        },
      },
    );
    return result;
  },
};

export default projectPayrollEmployeeCountsGet;
