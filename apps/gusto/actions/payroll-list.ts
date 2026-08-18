import type { ActionDefinition } from "@w6w/types";
import { companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/companies/{company_id}/payrolls` — the payroll runs.
 *
 * The field that decides what a workflow may believe is **`processed`**. An
 * unprocessed payroll is a draft: its totals move, employees have not been
 * paid, and reporting it as spend is simply wrong. A processed one is final and
 * carries `payroll_deadline` and `check_date` — the latter being when money
 * actually lands, which is usually days after the period ended.
 *
 * `processing_request` and `payroll_status_meta` describe an in-flight
 * submission, which is how a workflow tells "being processed right now" from
 * "nobody has run it".
 *
 * The date window filters by **pay period**, not by check date, so a payroll
 * whose period ended in one month and paid in the next appears under the month
 * of the period.
 */
const action: ActionDefinition = {
  key: "payroll-list",
  type: "read",
  resource: "payroll",
  title: "List payrolls",
  description:
    "A company's payroll runs. `processed` is the field that matters — an unprocessed payroll " +
    "is a draft whose totals still move.",
  params: [
    COMPANY_PARAM,
    {
      key: "startDate",
      label: "Period Start On Or After",
      type: "date",
      default: "",
      hint: "Filters by PAY PERIOD, not by check date.",
    },
    {
      key: "endDate",
      label: "Period End On Or Before",
      type: "date",
      default: "",
    },
    {
      key: "processingStatuses",
      label: "Processing Statuses",
      type: "string",
      default: "",
      advanced: true,
      placeholder: "processed,unprocessed",
      hint: "Comma-separated.",
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      default: "",
      advanced: true,
      placeholder: "totals,payroll_status_meta",
      hint: "Comma-separated nested data — `totals` is the one worth asking for.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "payroll_uuid", type: "string", label: "Payroll UUID" },
    { key: "check_date", type: "string", label: "Check date" },
    { key: "processed", type: "boolean", label: "Processed" },
    { key: "payroll_deadline", type: "string", label: "Deadline" },
    { key: "pay_period", type: "object", label: "Pay period" },
    { key: "totals", type: "object", label: "Totals" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    return await new GustoClient(ctx).requestAll(
      `/v1/companies/${encodeURIComponent(companyId)}/payrolls`,
      {
        query: {
          start_date: String(p.startDate ?? "") || undefined,
          end_date: String(p.endDate ?? "") || undefined,
          processing_statuses: String(p.processingStatuses ?? "") || undefined,
          include: String(p.include ?? "") || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
