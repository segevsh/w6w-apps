import type { ActionDefinition } from "@w6w/types";
import { RocketReachClient } from "../lib/client.ts";
import {
  COMPANY_LOOKUP_PARAMS,
  COMPANY_OUTPUT,
  companyLookupQuery,
  companyOutput,
} from "../lib/profile.ts";

type Input = Record<string, unknown>;

/** `GET /universal/company/lookup` — Universal Credits accounts only; 1 credit per enriched company. */
const universalLookupCompany: ActionDefinition<Input> = {
  key: "universal-lookup-company",
  type: "read",
  resource: "company",
  title: "Universal Lookup Company",
  description: "Universal Credits version of Lookup Company: get a company's profile by domain " +
    "(preferred), RocketReach ID, name, LinkedIn URL or ticker. Charges 1 credit per company " +
    "with enriched information.",
  params: COMPANY_LOOKUP_PARAMS,
  output: COMPANY_OUTPUT,

  async execute(input, ctx) {
    const { body } = await new RocketReachClient(ctx).request("/universal/company/lookup", {
      query: companyLookupQuery(input),
    });
    return companyOutput(body);
  },
};

export default universalLookupCompany;
