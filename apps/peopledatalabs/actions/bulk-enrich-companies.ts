import type { ActionDefinition } from "@w6w/types";
import { PdlClient } from "../lib/client.ts";
import { sandboxParam } from "../lib/params.ts";
import { normalizeRequests, summarize } from "./bulk-enrich-persons.ts";

interface Input {
  requests: unknown;
  sandbox?: boolean;
}

const bulkEnrichCompanies: ActionDefinition<Input> = {
  key: "bulk-enrich-companies",
  type: "read",
  resource: "company",
  title: "Bulk Enrich Companies",
  description:
    "Enrich up to 100 companies in one call; the same as running Enrich Company for each. Results come back in request order, each with its own status (a 404 entry is a no-match, not a failure). Costs one credit per 200 entry.",
  params: [
    {
      key: "requests",
      label: "Requests",
      type: "json",
      required: true,
      hint:
        'JSON array of up to 100 entries: [{"params":{"website":"google.com"}}]. A bare params object per entry also works. Params are the Enrich Company inputs.',
    },
    sandboxParam,
  ],
  output: [
    { key: "results", type: "array", label: "One {status, likelihood, ...company} per request" },
    { key: "count", type: "number", label: "Entries returned" },
    { key: "matches", type: "number", label: "Entries with status 200 (the credits spent)" },
  ],

  async execute(input, ctx) {
    const res = await new PdlClient(ctx).request<unknown>("POST", "/v5/company/enrich/bulk", {
      body: { requests: normalizeRequests(input.requests) },
      sandbox: input.sandbox === true,
    });
    return summarize(res);
  },
};

export default bulkEnrichCompanies;
