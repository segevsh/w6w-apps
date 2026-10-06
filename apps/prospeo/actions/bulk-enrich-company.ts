import type { ActionDefinition } from "@w6w/types";
import { bulkRecords, ProspeoClient } from "../lib/client.ts";

const bulkEnrichCompany: ActionDefinition<{ records: unknown }> = {
  key: "bulk-enrich-company",
  type: "perform",
  resource: "company",
  title: "Bulk Enrich Companies",
  description:
    "Enrich up to 50 companies in one request (POST /bulk-enrich-company). 1 credit per match. Matches are returned by your `identifier`; unmatched and under-specified records are listed separately.",
  idempotent: true,
  params: [
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      hint:
        'Array of up to 50 objects, each with a string "identifier" you choose plus company_website, company_linkedin_url, company_name or company_id.',
    },
  ],
  output: [
    { key: "total_cost", type: "number", label: "Credits spent" },
    { key: "matched", type: "array", label: "{ identifier, company } per match" },
    { key: "not_matched", type: "array", label: "Identifiers that found no match" },
    { key: "invalid_datapoints", type: "array", label: "Identifiers with no usable datapoint" },
  ],

  async execute(input, ctx) {
    const data = bulkRecords(input.records);
    const body = await new ProspeoClient(ctx).call<Record<string, unknown>>(
      "/bulk-enrich-company",
      { body: { data } },
    );
    return {
      total_cost: body.total_cost,
      matched: body.matched ?? [],
      not_matched: body.not_matched ?? [],
      invalid_datapoints: body.invalid_datapoints ?? [],
    };
  },
};

export default bulkEnrichCompany;
