import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, LushaClient, strList } from "../lib/client.ts";

/** Send `options` only when at least one option was set. */
const optionsOf = (o: Record<string, unknown>) => Object.keys(o).length > 0 ? o : undefined;

interface Input {
  companies: unknown;
  reveal?: string | string[];
  includePartialProfiles?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "company-search-and-enrich",
  type: "perform",
  resource: "company",
  title: "Search and Enrich Companies",
  description: "Find companies and reveal their full data in one call. Spends credits.",
  idempotent: false,
  params: [
    {
      key: "companies",
      label: "Companies",
      type: "json",
      required: true,
      hint: 'Up to 100: [{"name":"Acme"}].',
    },
    { key: "reveal", label: "Reveal", type: "string", hint: "Same tokens as Enrich Companies." },
    {
      key: "includePartialProfiles",
      label: "Include partial profiles",
      type: "boolean",
      hint: "Also return profiles with only partial data.",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Request correlation id" },
    { key: "results", type: "array", label: "Enriched companies" },
    { key: "billing", type: "object", label: "Credits charged and results returned" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/v3/companies/search-and-enrich`, {
      body: compact({
        companies: jsonValue(input.companies),
        reveal: strList(input.reveal),
        options: optionsOf(compact({ includePartialProfiles: input.includePartialProfiles })),
      }),
    });
  },
};

export default action;
