import type { ActionDefinition } from "@w6w/types";
import { companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/companies/{company_uuid}/contractors` — the people who are not
 * employees.
 *
 * Contractors are a separate collection from employees in Gusto, and that is
 * not a filing detail: they have different tax treatment, different pay
 * mechanics (`contractor-payment-list` rather than payrolls), and a `type` of
 * `Individual` or `Business`. A workflow that reads only `employee-list` and
 * calls it "headcount" is missing everyone here.
 *
 * `wage_type` distinguishes `Fixed` from `Hourly`, which decides whether
 * `hourly_rate` or a per-payment amount is the meaningful number.
 */
const action: ActionDefinition = {
  key: "contractor-list",
  type: "read",
  resource: "contractor",
  title: "List contractors",
  description:
    "A company's contractors — a separate collection from employees, with their own tax " +
    "treatment and their own payment route.",
  params: [COMPANY_PARAM, ...LIST_PARAMS],
  output: [
    { key: "uuid", type: "string", label: "Contractor UUID" },
    { key: "type", type: "string", label: "Individual or Business" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "business_name", type: "string", label: "Business name" },
    { key: "wage_type", type: "string", label: "Wage type" },
    { key: "hourly_rate", type: "string", label: "Hourly rate" },
    { key: "is_active", type: "boolean", label: "Active" },
    { key: "version", type: "string", label: "Version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    return await new GustoClient(ctx).requestAll(
      `/v1/companies/${encodeURIComponent(companyId)}/contractors`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
