import type { ActionDefinition } from "@w6w/types";
import { RocketReachClient } from "../lib/client.ts";
import {
  COMPANY_LOOKUP_PARAMS,
  COMPANY_OUTPUT,
  companyLookupQuery,
  companyOutput,
} from "../lib/profile.ts";

type Input = Record<string, unknown>;

/**
 * `GET /company/lookup/` (trailing slash, as published). Domain is the vendor's
 * preferred key; a company credit is charged when any company data is returned.
 */
const lookupCompany: ActionDefinition<Input> = {
  key: "lookup-company",
  type: "read",
  resource: "company",
  title: "Lookup Company",
  description: "Get a company's profile by domain (preferred), RocketReach ID, name, LinkedIn " +
    "URL or ticker: size, revenue, industry, tech stack, funding investors, address, growth and " +
    "competitors. Consumes a company credit when data is returned. For Universal Credits " +
    "accounts use Universal Lookup Company.",
  params: COMPANY_LOOKUP_PARAMS,
  output: COMPANY_OUTPUT,

  async execute(input, ctx) {
    const { body } = await new RocketReachClient(ctx).request("/company/lookup/", {
      query: companyLookupQuery(input),
    });
    return companyOutput(body);
  },
};

export default lookupCompany;
