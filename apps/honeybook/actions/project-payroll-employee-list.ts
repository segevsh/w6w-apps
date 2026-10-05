import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  projectId: string;
}

const projectPayrollEmployeeList: ActionDefinition<Input> = {
  key: "project-payroll-employee-list",
  type: "read",
  resource: "project",
  title: "List Project Payroll Employees",
  description: "List a project's payroll employees.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Project id (BSON ObjectId hex).",
    },
  ],
  output: [
    { key: "employee_ids", type: "array", label: "Employee ids" },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request(
      "GET",
      `/projects/${encodeId(input.projectId)}/payroll_employees`,
    );
    return result;
  },
};

export default projectPayrollEmployeeList;
