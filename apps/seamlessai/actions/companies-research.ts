import type { ActionDefinition } from "@w6w/types";
import { compact, SeamlessClient, toList, toObjectList } from "../lib/client.ts";

/** `POST /api/client/v2/companies/research` — Research Companies. */
interface Input {
  searchResultIds?: unknown;
  companies?: unknown;
  skipDeduplicationCheck?: boolean;
}

const companiesResearch: ActionDefinition<Input> = {
  key: "companies-research",
  type: "perform",
  resource: "company",
  title: "Research Companies",
  description:
    "Start asynchronous research (enrichment) for companies, by searchResultIds from companies-search or by domain / name. Returns requestIds to pass to companies-research-poll.",
  idempotent: false,
  params: [
    {
      key: "searchResultIds",
      label: "Search result IDs",
      type: "json",
      hint: "From companies-search (up to 100). Use this OR companies.",
    },
    {
      key: "companies",
      label: "Companies by identity",
      type: "json",
      hint: "JSON array (up to 100) of {domain} or {companyName} objects.",
    },
    {
      key: "skipDeduplicationCheck",
      label: "Skip duplicate check",
      type: "boolean",
      hint: "Re-research records you researched recently (can spend credits again).",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the request was accepted" },
    { key: "requestIds", type: "array", label: "IDs to poll" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("POST", "/companies/research", {
      body: compact({
        searchResultIds: toList(input.searchResultIds),
        companies: toObjectList(input.companies, "Companies by identity"),
        skipDeduplicationCheck: input.skipDeduplicationCheck,
      }),
    });
  },
};

export default companiesResearch;
