import type { ActionDefinition } from "@w6w/types";
import { companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/companies/{company_id}` — the company record.
 *
 * Two fields carry most of the value. **`company_status`** distinguishes an
 * account that can actually run payroll (`Approved`) from one still onboarding
 * or suspended — a workflow reading payrolls from a `Suspended` company gets an
 * empty list rather than an error. And **`version`** is the optimistic lock
 * that any later update has to carry.
 *
 * `primary_payroll_admin` is the human to escalate to when something needs a
 * decision this app cannot make.
 */
const action: ActionDefinition = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get company",
  description:
    "The company record — including whether it is approved to run payroll at all, and the " +
    "version any update has to carry.",
  params: [COMPANY_PARAM],
  output: [
    { key: "uuid", type: "string", label: "Company UUID" },
    { key: "name", type: "string", label: "Name" },
    { key: "trade_name", type: "string", label: "Trade name" },
    { key: "ein", type: "string", label: "EIN" },
    { key: "company_status", type: "string", label: "Status" },
    { key: "entity_type", type: "string", label: "Entity type" },
    { key: "primary_payroll_admin", type: "object", label: "Primary payroll admin" },
    { key: "version", type: "string", label: "Version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    return await new GustoClient(ctx).request(`/v1/companies/${encodeURIComponent(companyId)}`);
  },
};

export default action;
