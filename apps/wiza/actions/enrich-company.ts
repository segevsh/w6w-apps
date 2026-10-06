import type { ActionDefinition } from "@w6w/types";
import { compact, dataOf, WizaClient } from "../lib/client.ts";

interface Input {
  companyName?: string;
  companyDomain?: string;
  companyLinkedinId?: string;
  companyLinkedinSlug?: string;
}

const enrichCompany: ActionDefinition<Input> = {
  key: "enrich-company",
  type: "perform",
  resource: "company",
  title: "Enrich Company",
  description:
    "Enrich a company synchronously (POST /api/company_enrichments) from a name, domain, LinkedIn ID or LinkedIn slug: industry, size, revenue, funding, location and socials. 2 API credits, charged only when a company is found. A company that cannot be found is HTTP 404 and fails the action. Limits: 30 requests/minute, 43,200/day.",
  idempotent: true,
  params: [
    { key: "companyDomain", label: "Company domain", type: "string", placeholder: "wiza.co" },
    { key: "companyName", label: "Company name", type: "string", placeholder: "Wiza" },
    {
      key: "companyLinkedinId",
      label: "LinkedIn company ID",
      type: "string",
      placeholder: "18663757",
    },
    {
      key: "companyLinkedinSlug",
      label: "LinkedIn company slug",
      type: "string",
      hint: "The slug from the company's LinkedIn URL.",
      placeholder: "wiza",
    },
  ],
  output: [
    { key: "company_name", type: "string", label: "Name" },
    { key: "company_domain", type: "string", label: "Domain" },
    { key: "company_industry", type: "string", label: "Industry" },
    { key: "company_size", type: "number", label: "Headcount" },
    { key: "company_size_range", type: "string", label: "Headcount range" },
    { key: "company_founded", type: "number", label: "Year founded" },
    { key: "company_revenue_range", type: "string", label: "Revenue range" },
    { key: "company_funding", type: "string", label: "Total funding" },
    { key: "company_type", type: "string", label: "Company type" },
    { key: "company_location", type: "string", label: "Headquarters" },
    { key: "company_linkedin", type: "string", label: "LinkedIn URL" },
    { key: "credits", type: "object", label: "Credits charged" },
  ],

  async execute(input, ctx) {
    const payload = compact({
      company_name: input.companyName,
      company_domain: input.companyDomain,
      company_linkedin_id: input.companyLinkedinId,
      company_linkedin_slug: input.companyLinkedinSlug,
    });
    if (Object.keys(payload).length === 0) {
      throw new Error(
        "provide at least one of company name, domain, LinkedIn ID or LinkedIn slug",
      );
    }
    const body = await new WizaClient(ctx).call("/api/company_enrichments", {
      method: "POST",
      body: payload,
    });
    return dataOf(body);
  },
};

export default enrichCompany;
