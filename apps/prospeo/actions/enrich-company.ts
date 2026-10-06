import type { ActionDefinition } from "@w6w/types";
import { COMPANY_FIELDS, companyData, type CompanyInput, ProspeoClient } from "../lib/client.ts";

const enrichCompany: ActionDefinition<CompanyInput> = {
  key: "enrich-company",
  type: "perform",
  resource: "company",
  title: "Enrich Company",
  description:
    "Identify one company and return its firmographics, funding, technology and headcount data (POST /enrich-company). 1 credit per match; free for no match or a repeat within 90 days. Returns `matched: false` on NO_MATCH.",
  idempotent: true,
  params: COMPANY_FIELDS,
  output: [
    { key: "matched", type: "boolean", label: "Whether a company was matched" },
    { key: "free_enrichment", type: "boolean", label: "True if no credit was charged" },
    { key: "company", type: "object", label: "Company object" },
    { key: "error_code", type: "string", label: "Set when nothing matched" },
  ],

  async execute(input, ctx) {
    const data = companyData(input);
    if (Object.keys(data).length === 0) {
      throw new Error("give at least one of website, LinkedIn URL, name or company ID");
    }
    const body = await new ProspeoClient(ctx).call<Record<string, unknown>>("/enrich-company", {
      body: { data },
      soft: ["NO_MATCH"],
    });
    if (body.error === true) return { matched: false, error_code: body.error_code };
    return { matched: true, free_enrichment: body.free_enrichment, company: body.company };
  },
};

export default enrichCompany;
