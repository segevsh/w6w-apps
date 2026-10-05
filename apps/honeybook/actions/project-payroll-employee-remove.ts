import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  employeeId: string;
}

const projectPayrollEmployeeRemove: ActionDefinition<Input> = {
  key: "project-payroll-employee-remove",
  type: "perform",
  resource: "project",
  title: "Remove Project Payroll Employee",
  description: "Remove a payroll employee from a project.",
  idempotent: false,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Project id (BSON ObjectId hex).",
    },
    {
      key: "employeeId",
      label: "Employee ID",
      type: "string",
      required: true,
      hint: "Payroll employee id.",
    },
  ],
  output: [
    {
      key: "success",
      type: "boolean",
      label: "Whether the call succeeded (the API answers 204 No Content)",
    },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request(
      "DELETE",
      `/projects/${encodeId(input.projectId)}/payroll_employees/${encodeId(input.employeeId)}`,
    );
    return result ?? { success: true };
  },
};

export default projectPayrollEmployeeRemove;
