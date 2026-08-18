import type { ActionDefinition } from "@w6w/types";
import { GustoClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/employees/{employee_id}/garnishments` — court-ordered and voluntary
 * deductions.
 *
 * Garnishments are the part of payroll that is not the employer's choice: child
 * support, tax levies, wage assignments. They are read here and **not written**,
 * deliberately. Creating or editing a garnishment changes how much of somebody's
 * pay is withheld under a legal instrument, and doing that from an automation
 * is not a decision this app should make easy.
 *
 * Reading them is genuinely useful — reconciling a payroll's deductions,
 * checking that an order was recorded — and carries none of that risk.
 */
const action: ActionDefinition = {
  key: "garnishment-list",
  type: "read",
  resource: "employee",
  title: "List an employee's garnishments",
  description:
    "Court-ordered and voluntary deductions on an employee. Read-only here on purpose: these " +
    "are legal instruments, not settings.",
  params: [
    {
      key: "employeeId",
      label: "Employee ID",
      type: "string",
      required: true,
      default: "",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "uuid", type: "string", label: "Garnishment UUID" },
    { key: "amount", type: "string", label: "Amount" },
    { key: "description", type: "string", label: "Description" },
    { key: "court_ordered", type: "boolean", label: "Court ordered" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "times", type: "number", label: "Times" },
    { key: "recurring", type: "boolean", label: "Recurring" },
    { key: "annual_maximum", type: "string", label: "Annual maximum" },
    { key: "version", type: "string", label: "Version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const employeeId = String(p.employeeId ?? "").trim();
    if (!employeeId) throw new Error("`employeeId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    return await new GustoClient(ctx).requestAll(
      `/v1/employees/${encodeURIComponent(employeeId)}/garnishments`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
