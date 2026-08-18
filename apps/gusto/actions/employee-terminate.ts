import type { ActionDefinition } from "@w6w/types";
import { GustoClient } from "../lib/client.ts";

/**
 * `POST /v1/employees/{employee_id}/terminations` — end an employment.
 *
 * This is the most consequential call in the app, and the one most worth
 * refusing to make casually: it ends somebody's employment, stops their pay,
 * and starts the clock on their final paycheck and benefits. It is also visible
 * to the person immediately.
 *
 * Two parameters carry real legal weight:
 *
 *   - **`effective_date`** is the last day of employment, and in several
 *     American states the final paycheck is legally due on or before it. Setting
 *     it in the past can therefore create an immediate compliance problem
 *     rather than a record-keeping one.
 *   - **`run_termination_payroll`** decides whether Gusto creates an off-cycle
 *     payroll for the final pay. Off, whoever runs payroll must handle it
 *     manually — and a state that requires same-day final pay will not wait.
 *
 * Because neither of those is reversible by re-running anything, the action
 * requires an explicit confirmation and is declared **not** idempotent.
 */
const action: ActionDefinition = {
  key: "employee-terminate",
  type: "perform",
  resource: "employee",
  title: "Terminate employee",
  description:
    "End an employment. Stops pay, starts the final-paycheck clock, and is visible to the " +
    "employee. Requires an explicit confirmation.",
  idempotent: false,
  params: [
    {
      key: "employeeId",
      label: "Employee ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "effectiveDate",
      label: "Effective Date",
      type: "date",
      required: true,
      default: "",
      hint: "The last day of employment, `yyyy-mm-dd`. Several US states require the final " +
        "paycheck on or before this date, so a date in the past is a compliance problem rather " +
        "than a correction.",
    },
    {
      key: "runTerminationPayroll",
      label: "Run Termination Payroll",
      type: "boolean",
      default: true,
      hint: "On, Gusto creates an off-cycle payroll for the final pay. Off, somebody has to " +
        "handle it by hand.",
    },
    {
      key: "confirm",
      label: "Yes, terminate this employment",
      type: "boolean",
      required: true,
      default: false,
      hint: "This ends a person's employment and their pay. It cannot be undone by re-running " +
        "anything.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Termination UUID" },
    { key: "effective_date", type: "string", label: "Effective date" },
    { key: "run_termination_payroll", type: "boolean", label: "Termination payroll" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "version", type: "string", label: "Version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const employeeId = String(p.employeeId ?? "").trim();
    if (!employeeId) throw new Error("`employeeId` is required");
    const effectiveDate = String(p.effectiveDate ?? "").trim();
    if (!effectiveDate) throw new Error("`effectiveDate` is required — it is the last day worked");
    if (p.confirm !== true) {
      throw new Error(
        `refusing to terminate employee ${employeeId} without \`confirm\` — this ends their ` +
          "employment and their pay, and re-running nothing will undo it",
      );
    }

    ctx.log("warn", "terminating a Gusto employment", { employeeId, effectiveDate });
    return await new GustoClient(ctx).request(
      `/v1/employees/${encodeURIComponent(employeeId)}/terminations`,
      {
        method: "POST",
        body: {
          effective_date: effectiveDate,
          run_termination_payroll: p.runTerminationPayroll !== false,
        },
      },
    );
  },
};

export default action;
