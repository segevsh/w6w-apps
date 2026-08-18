import type { ActionDefinition } from "@w6w/types";
import { companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/companies/{company_id}/pay_periods` — the calendar payroll runs on.
 *
 * Each period carries a **`payroll_deadline`**, and that is the field a
 * scheduling workflow exists to watch: it is when everything variable — hours,
 * bonuses, reimbursements, a new hire's first pay — has to be in Gusto for that
 * run. Missing it does not fail loudly; the item simply lands in the next
 * period.
 *
 * The `eligible_employees` list on each period is what makes a "did we forget
 * anybody" check possible before the deadline rather than after the payslips.
 */
const action: ActionDefinition = {
  key: "pay-period-list",
  type: "read",
  resource: "payroll",
  title: "List pay periods",
  description:
    "The pay calendar, with each period's payroll deadline — the date a workflow has to beat " +
    "for hours, bonuses and reimbursements to land in that run.",
  params: [
    COMPANY_PARAM,
    { key: "startDate", label: "Start On Or After", type: "date", default: "" },
    { key: "endDate", label: "End On Or Before", type: "date", default: "" },
  ],
  output: [
    { key: "start_date", type: "string", label: "Start date" },
    { key: "end_date", type: "string", label: "End date" },
    { key: "pay_schedule_uuid", type: "string", label: "Pay schedule" },
    { key: "payroll", type: "object", label: "Payroll (deadline, processed)" },
    { key: "eligible_employees", type: "array", label: "Eligible employees" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    return await new GustoClient(ctx).request(
      `/v1/companies/${encodeURIComponent(companyId)}/pay_periods`,
      {
        query: {
          start_date: String(p.startDate ?? "") || undefined,
          end_date: String(p.endDate ?? "") || undefined,
        },
      },
    );
  },
};

export default action;
