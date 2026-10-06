import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient } from "../lib/client.ts";

interface Input {
  query: string;
}

/**
 * `GET /public/companies/autocomplete?query=`. The vendor documents the request but not
 * the response body (its OpenAPI 200 is an empty schema), so `data` is returned as is.
 */
const findCompanyDomains: ActionDefinition<Input> = {
  key: "find-company-domains",
  type: "search",
  resource: "company",
  title: "Find Domains for Company",
  description: "Autocomplete a company name, domain or website URL into matching company " +
    "domains. Returns the vendor's result as is.",
  params: [{
    key: "query",
    label: "Company name, domain or URL",
    type: "string",
    required: true,
  }],
  output: [{ key: "result", type: "object", label: "Vendor result (shape undocumented)" }],

  async execute(input, ctx) {
    const query = String(input.query ?? "").trim();
    if (!query) throw new Error("query is required");
    const { data } = await new ClearoutClient(ctx).request("/public/companies/autocomplete", {
      query: { query },
    });
    return { result: data ?? null };
  },
};

export default findCompanyDomains;
