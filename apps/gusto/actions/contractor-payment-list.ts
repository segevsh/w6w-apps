import type { ActionDefinition } from "@w6w/types";
import { companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/companies/{company_id}/contractor_payments` — what contractors were
 * paid.
 *
 * The contractor equivalent of a payroll, and shaped differently for a reason:
 * contractor payments are individual transactions with their own dates rather
 * than a run covering everybody. So this takes a **date window** and returns
 * payments in it, with a `debit_date` — when the money leaves — separate from
 * the payment date.
 *
 * For a workflow reconciling spend, contractor payments and payrolls have to be
 * read separately and added: neither includes the other.
 */
const action: ActionDefinition = {
  key: "contractor-payment-list",
  type: "read",
  resource: "contractor",
  title: "List contractor payments",
  description:
    "Contractor payments in a date window — individual transactions rather than a run, and " +
    "entirely separate from payrolls when totting up spend.",
  params: [
    COMPANY_PARAM,
    {
      key: "startDate",
      label: "From",
      type: "date",
      required: true,
      default: "",
      hint: "`yyyy-mm-dd`.",
    },
    { key: "endDate", label: "To", type: "date", required: true, default: "" },
  ],
  output: [
    { key: "total_amount", type: "string", label: "Total amount" },
    { key: "total_debit_amount", type: "string", label: "Total debit" },
    { key: "contractor_payments", type: "array", label: "Payments" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    const startDate = String(p.startDate ?? "").trim();
    const endDate = String(p.endDate ?? "").trim();
    if (!startDate || !endDate) {
      throw new Error("`startDate` and `endDate` are both required — Gusto needs a window");
    }

    return await new GustoClient(ctx).request(
      `/v1/companies/${encodeURIComponent(companyId)}/contractor_payments`,
      { query: { start_date: startDate, end_date: endDate } },
    );
  },
};

export default action;
