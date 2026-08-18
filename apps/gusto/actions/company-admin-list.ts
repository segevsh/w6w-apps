import type { ActionDefinition } from "@w6w/types";
import { companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/companies/{company_id}/admins` — who can approve things.
 *
 * Payroll is full of decisions an automation must not make on its own —
 * approving a termination, changing compensation, running an off-cycle. This is
 * the list of people who can, which makes it the lookup behind any workflow
 * that escalates rather than acts.
 */
const action: ActionDefinition = {
  key: "company-admin-list",
  type: "read",
  resource: "company",
  title: "List company admins",
  description:
    "The administrators of the company — the people a workflow escalates to when a payroll " +
    "decision is not an automation's to make.",
  params: [COMPANY_PARAM, ...LIST_PARAMS],
  output: [
    { key: "uuid", type: "string", label: "Admin UUID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    return await new GustoClient(ctx).requestAll(
      `/v1/companies/${encodeURIComponent(companyId)}/admins`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
