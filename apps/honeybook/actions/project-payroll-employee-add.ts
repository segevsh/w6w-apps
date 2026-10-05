import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  employeeId: string;
}

const projectPayrollEmployeeAdd: ActionDefinition<Input> = {
  key: "project-payroll-employee-add",
  type: "perform",
  resource: "project",
  title: "Add Project Payroll Employee",
  description: "Assign a payroll employee to a project (idempotent).",
  idempotent: true,
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
    { key: "id", type: "string", label: "Id" },
    { key: "name", type: "string", label: "Name" },
    { key: "project_date", type: "string", label: "Project date" },
    { key: "project_end_date", type: "string", label: "Project end date" },
    { key: "project_time_start", type: "string", label: "Project time start" },
    { key: "project_time_end", type: "string", label: "Project time end" },
    { key: "project_timezone", type: "string", label: "Project timezone" },
    { key: "project_timezone_iana", type: "string", label: "Project timezone iana" },
    { key: "project_location", type: "string", label: "Project location" },
    { key: "project_details", type: "string", label: "Project details" },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request(
      "PUT",
      `/projects/${encodeId(input.projectId)}/payroll_employees/${encodeId(input.employeeId)}`,
    );
    return result;
  },
};

export default projectPayrollEmployeeAdd;
