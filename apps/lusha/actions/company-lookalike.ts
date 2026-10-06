import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, LushaClient } from "../lib/client.ts";

interface Input {
  seeds: unknown;
  exclude?: unknown;
  limit?: number;
  dedupeSessionId?: string;
  tableId?: string;
}

const action: ActionDefinition<Input> = {
  key: "company-lookalike",
  type: "read",
  resource: "company",
  title: "Find Lookalike Companies",
  description:
    "Find companies similar to 5-100 seed companies (Lusha ids, domains or LinkedIn URLs).",
  params: [
    {
      key: "seeds",
      label: "Seeds",
      type: "json",
      required: true,
      hint: '{"ids":[...],"domains":[...],"linkedinUrls":[...]} \u2014 5 to 100 in total.',
    },
    { key: "exclude", label: "Exclude", type: "json", hint: "Same shape as seeds." },
    { key: "limit", label: "Limit", type: "number", hint: "1-100, default 25." },
    { key: "dedupeSessionId", label: "Dedupe session ID", type: "string" },
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      hint: "Beta Tables API: also add the results to this table.",
    },
  ],
  output: [
    { key: "dedupeSessionId", type: "string", label: "Pass back to page without repeats" },
    { key: "results", type: "array", label: "Lookalike companies" },
    { key: "meta", type: "object", label: "returned, hasMore" },
    { key: "billing", type: "object", label: "Credits charged and results returned" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/v3/companies/lookalike`, {
      body: compact({
        seeds: jsonValue(input.seeds),
        exclude: jsonValue(input.exclude),
        limit: input.limit,
        dedupeSessionId: input.dedupeSessionId,
        tableId: input.tableId,
      }),
    });
  },
};

export default action;
