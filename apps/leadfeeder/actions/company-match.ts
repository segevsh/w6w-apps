import type { ActionDefinition } from "@w6w/types";
import { jsonValue, LeadfeederClient, reply } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  companies: unknown;
  maxResultsPerCompany?: number;
}

/** `POST /v1/companies/match` — verified against the vendor OpenAPI document (2026-10-06). */
const companyMatch: ActionDefinition<Input> = {
  key: "company-match",
  type: "search",
  resource: "company",
  title: "Match Companies",
  description:
    "Match company records you hold (name, URL, VAT id, address\u2026) against the Leadfeeder database. Consumes credits.",
  params: [
    accountIdParam,
    {
      key: "companies",
      label: "Companies",
      type: "json",
      required: true,
      hint:
        '`[{"company_name":"Acme GmbH","url":"acme.com","country_code":"DE"}]` \u2014 fields: company_name, url, email, phone, vat_id, register_id, register_location, street, street_name, street_number, postal_code, city, country, country_code.',
    },
    {
      key: "maxResultsPerCompany",
      label: "Max results per company",
      type: "number",
      hint: "Up to 20 candidate matches per input company.",
    },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = "/v1/companies/match";
    const query = {
      account_id: input.accountId,
      max_results_per_company: input.maxResultsPerCompany,
    };
    const body = { companies: jsonValue(input.companies) };
    return reply(await new LeadfeederClient(ctx).request("POST", path, { query, body }));
  },
};

export default companyMatch;
