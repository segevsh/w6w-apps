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
  key: "contact-lookalike",
  type: "read",
  resource: "contact",
  title: "Find Lookalike Contacts",
  description:
    "Find contacts similar to 5-100 seed contacts. Seeds can be Lusha ids, LinkedIn URLs, emails, or name + company objects.",
  params: [
    {
      key: "seeds",
      label: "Seeds",
      type: "json",
      required: true,
      hint:
        '{"ids":["..."],"linkedinUrls":[...],"emails":[...],"contacts":[{"firstName":"Ada","lastName":"L","companyDomain":"x.com"}]} \u2014 5 to 100 in total.',
    },
    {
      key: "exclude",
      label: "Exclude",
      type: "json",
      hint: "Same shape as seeds; those contacts are always filtered out.",
    },
    { key: "limit", label: "Limit", type: "number", hint: "1-100, default 25." },
    {
      key: "dedupeSessionId",
      label: "Dedupe session ID",
      type: "string",
      hint: "From a previous response, to page without repeats.",
    },
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      hint: "Beta Tables API: also add the results to this table.",
    },
  ],
  output: [
    {
      key: "dedupeSessionId",
      type: "string",
      label: "Pass back to fetch the next page without repeats",
    },
    { key: "results", type: "array", label: "Lookalike contacts" },
    { key: "meta", type: "object", label: "returned, hasMore" },
    { key: "billing", type: "object", label: "Credits charged and results returned" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/v3/contacts/lookalike`, {
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
