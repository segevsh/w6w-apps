import type { ActionDefinition } from "@w6w/types";
import { ClearbitClient, compact, COMPANY_HOST } from "../lib/client.ts";

interface Input {
  domain: string;
  companyName?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
}

/**
 * `GET company-stream.clearbit.com/v2/companies/find?domain=...` — the
 * Company Enrichment API. Spends a paid credit per successful match.
 *
 * `domain` is the only required field. The optional fields are match-quality
 * hints, same pattern and same source of truth as `enrich-person` — verified
 * against n8n's `Clearbit.node.ts`, which sends these exact snake_case query
 * keys (`company_name`, `linkedin`, `twitter`, `facebook`).
 */
const action: ActionDefinition<Input> = {
  key: "enrich-company",
  type: "read",
  resource: "company",
  title: "Enrich Company",
  description: "Look up firmographic, technographic and social data for a company by domain.",
  params: [
    { key: "domain", label: "Domain", type: "string", required: true, placeholder: "example.com" },
    { key: "companyName", label: "Company Name", type: "string", advanced: true },
    { key: "linkedin", label: "LinkedIn URL", type: "string", advanced: true },
    { key: "twitter", label: "Twitter Handle", type: "string", advanced: true },
    { key: "facebook", label: "Facebook URL", type: "string", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Company ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "domain", type: "string", label: "Domain" },
    { key: "category", type: "object", label: "Category" },
    { key: "metrics", type: "object", label: "Metrics" },
    { key: "tech", type: "array", label: "Technologies" },
  ],

  async execute(input, ctx) {
    const domain = (input.domain ?? "").trim();
    if (!domain) throw new Error("`domain` is required");
    const client = new ClearbitClient(ctx);
    return await client.request(COMPANY_HOST, "/v2/companies/find", {
      query: compact({
        domain,
        company_name: input.companyName,
        linkedin: input.linkedin,
        twitter: input.twitter,
        facebook: input.facebook,
      }),
    });
  },
};

export default action;
