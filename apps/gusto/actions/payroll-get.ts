import type { ActionDefinition } from "@w6w/types";
import { companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/companies/{company_id}/payrolls/{payroll_id}` — one payroll in full.
 *
 * This is where the money is: `employee_compensations` breaks the run down per
 * person, with hours, earnings, taxes, deductions and benefits, and `totals`
 * sums it. It is the call behind any workflow that reconciles payroll against a
 * ledger, or checks that an expected bonus actually appeared.
 *
 * The same `processed` caveat applies with more force here than on the list: an
 * unprocessed payroll's per-employee numbers are a **projection**, recalculated
 * as hours and deductions change. Posting them to an accounting system as
 * actuals produces a set of books that quietly disagrees with the bank.
 */
const action: ActionDefinition = {
  key: "payroll-get",
  type: "read",
  resource: "payroll",
  title: "Get payroll",
  description:
    "One payroll broken down per employee — hours, earnings, taxes, deductions. Unprocessed " +
    "numbers are a projection, not actuals.",
  params: [
    {
      key: "payrollId",
      label: "Payroll ID",
      type: "string",
      required: true,
      default: "",
    },
    COMPANY_PARAM,
    {
      key: "include",
      label: "Include",
      type: "string",
      default: "",
      advanced: true,
      placeholder: "benefits,deductions,taxes",
      hint: "Comma-separated. Without these the per-employee breakdown omits the deductions.",
    },
  ],
  output: [
    { key: "payroll_uuid", type: "string", label: "Payroll UUID" },
    { key: "check_date", type: "string", label: "Check date" },
    { key: "processed", type: "boolean", label: "Processed" },
    { key: "pay_period", type: "object", label: "Pay period" },
    { key: "totals", type: "object", label: "Totals" },
    { key: "employee_compensations", type: "array", label: "Per-employee breakdown" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    const payrollId = String(p.payrollId ?? "").trim();
    if (!payrollId) throw new Error("`payrollId` is required");

    return await new GustoClient(ctx).request(
      `/v1/companies/${encodeURIComponent(companyId)}/payrolls/${encodeURIComponent(payrollId)}`,
      { query: { include: String(p.include ?? "") || undefined } },
    );
  },
};

export default action;
