import type { ActionDefinition } from "@w6w/types";
import {
  bulkRecords,
  ENRICH_FLAGS,
  type EnrichFlags,
  enrichFlags,
  ProspeoClient,
} from "../lib/client.ts";

interface Input extends EnrichFlags {
  records: unknown;
}

const bulkEnrichPerson: ActionDefinition<Input> = {
  key: "bulk-enrich-person",
  type: "perform",
  resource: "person",
  title: "Bulk Enrich Persons",
  description:
    "Enrich up to 50 people in one request (POST /bulk-enrich-person). Credit rules and the verified/mobile flags match Enrich Person and apply to every record. Matches are returned by your `identifier`; unmatched and under-specified records are listed separately.",
  idempotent: true,
  params: [
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      hint:
        'Array of up to 50 objects, each with a string "identifier" you choose plus the Enrich Person datapoints in the API\'s snake_case: first_name, last_name, full_name, linkedin_url, email, company_name, company_website, company_linkedin_url, person_id.',
    },
    ...ENRICH_FLAGS,
  ],
  output: [
    { key: "total_cost", type: "number", label: "Credits spent" },
    { key: "matched", type: "array", label: "{ identifier, person, company } per match" },
    { key: "not_matched", type: "array", label: "Identifiers that found no match" },
    { key: "invalid_datapoints", type: "array", label: "Identifiers below the matching minimum" },
  ],

  async execute(input, ctx) {
    const data = bulkRecords(input.records);
    const body = await new ProspeoClient(ctx).call<Record<string, unknown>>(
      "/bulk-enrich-person",
      { body: { ...enrichFlags(input), data } },
    );
    return {
      total_cost: body.total_cost,
      matched: body.matched ?? [],
      not_matched: body.not_matched ?? [],
      invalid_datapoints: body.invalid_datapoints ?? [],
    };
  },
};

export default bulkEnrichPerson;
