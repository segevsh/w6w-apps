import type { ActionDefinition } from "@w6w/types";
import { GustoClient } from "../lib/client.ts";

/**
 * `GET /v1/employees/{employee_id}` — one employee.
 *
 * The call to make immediately before any update, because the **`version`** it
 * returns is what the update has to carry. Gusto rejects a stale one rather
 * than overwriting whatever changed in between, so reading late and writing
 * quickly is the pattern that works.
 *
 * `include=all_compensations` brings back the jobs and their pay rates, which
 * are otherwise separate calls.
 */
const action: ActionDefinition = {
  key: "employee-get",
  type: "read",
  resource: "employee",
  title: "Get employee",
  description:
    "One employee, with the `version` any update has to carry. Read this immediately before " +
    "writing — Gusto rejects a stale version.",
  params: [
    {
      key: "employeeId",
      label: "Employee ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      default: "",
      placeholder: "all_compensations,custom_fields",
      hint: "Comma-separated nested data.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Employee UUID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "date_of_birth", type: "string", label: "Date of birth" },
    { key: "terminated", type: "boolean", label: "Terminated" },
    { key: "jobs", type: "array", label: "Jobs" },
    { key: "version", type: "string", label: "Version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const employeeId = String(p.employeeId ?? "").trim();
    if (!employeeId) throw new Error("`employeeId` is required");
    return await new GustoClient(ctx).request(
      `/v1/employees/${encodeURIComponent(employeeId)}`,
      { query: { include: String(p.include ?? "") || undefined } },
    );
  },
};

export default action;
