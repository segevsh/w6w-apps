import type { ActionDefinition } from "@w6w/types";
import { companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/companies/{company_id}/locations` — where the company operates.
 *
 * Locations are not addresses for the sake of it: in American payroll the work
 * location decides which state's taxes apply, which minimum wage applies, and
 * which state registrations the company needs. `mailing_address` and
 * `filing_address` mark the ones the tax filings use.
 *
 * An employee's own work address (a different collection) points at one of
 * these, which is why hiring somebody in a state the company has no location in
 * is a registration problem rather than a data-entry one.
 */
const action: ActionDefinition = {
  key: "company-location-list",
  type: "read",
  resource: "company",
  title: "List company locations",
  description:
    "The company's work locations — which decide state taxes, minimum wage and registrations, " +
    "not just where the post goes.",
  params: [COMPANY_PARAM, ...LIST_PARAMS],
  output: [
    { key: "uuid", type: "string", label: "Location UUID" },
    { key: "street_1", type: "string", label: "Street" },
    { key: "city", type: "string", label: "City" },
    { key: "state", type: "string", label: "State" },
    { key: "zip", type: "string", label: "ZIP" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "mailing_address", type: "boolean", label: "Mailing address" },
    { key: "filing_address", type: "boolean", label: "Filing address" },
    { key: "version", type: "string", label: "Version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    return await new GustoClient(ctx).requestAll(
      `/v1/companies/${encodeURIComponent(companyId)}/locations`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
