import type { ActionDefinition } from "@w6w/types";
import { AUTOCOMPLETE_HOST, ClearbitClient } from "../lib/client.ts";

interface Input {
  query: string;
}

/**
 * `GET autocomplete.clearbit.com/v1/companies/suggest?query=...` — the
 * Company Autocomplete API: given a partial company name, returns matching
 * companies with `name`, `domain` and `logo`.
 *
 * The one Clearbit endpoint that genuinely needs **no credential at all** —
 * Clearbit's own docs describe it as "a completely free API that lets you
 * auto-complete company names... without needing an account or an API key",
 * confirmed live 2026-08-01 with a bare unauthenticated request that returned
 * real matches (`query=segment` -> `[{"name":"Segment","domain":"segment.com",...}]`).
 * `requiresAuth: false` mirrors this app's `enrich-*` actions in reverse: those
 * need a Connection, this one has nothing to inject even if it had one, so
 * `sign` never runs for it.
 */
const action: ActionDefinition<Input> = {
  key: "autocomplete-company",
  type: "search",
  resource: "company",
  title: "Autocomplete Company",
  description: "Suggest companies matching a partial name — no credential required.",
  requiresAuth: false,
  params: [
    { key: "query", label: "Query", type: "string", required: true, placeholder: "segment" },
  ],
  output: [
    { key: "results", type: "array", label: "Matches (name, domain, logo)" },
  ],

  async execute(input, ctx) {
    const query = (input.query ?? "").trim();
    if (!query) throw new Error("`query` is required");
    const client = new ClearbitClient(ctx);
    const results = await client.request(AUTOCOMPLETE_HOST, "/v1/companies/suggest", {
      query: { query },
    });
    return { results };
  },
};

export default action;
