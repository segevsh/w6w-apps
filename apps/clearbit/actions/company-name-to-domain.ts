import type { ActionDefinition } from "@w6w/types";
import { ClearbitClient, COMPANY_LOOKUP_HOST } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `GET company.clearbit.com/v1/domains/find?name=...` — the Name to Domain
 * API: given a company's display name, returns its primary domain (and
 * name), e.g. `{name: "Clearbit"}` -> `{name: "Clearbit", domain:
 * "clearbit.com"}`.
 *
 * Confirmed against the official `clearbit-node` SDK (`src/name_to_domain.js`:
 * `resource.create('Name To Domain', {api: 'company', version: 1})`, `find`
 * calls `this.get('/domains/find', options)`). Per Clearbit's own Help
 * Center FAQ ("Autocomplete, Name to Domain, and Risk API FAQ"), this
 * endpoint is free for existing customers rather than spending a paid
 * enrichment credit — which is why the auth `test` hook also uses it as the
 * connection-liveness probe.
 */
const action: ActionDefinition<Input> = {
  key: "company-name-to-domain",
  type: "read",
  resource: "company",
  title: "Company Name → Domain",
  description: "Resolve a company's display name to its primary domain.",
  params: [
    { key: "name", label: "Company Name", type: "string", required: true, placeholder: "Clearbit" },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "domain", type: "string", label: "Domain" },
  ],

  async execute(input, ctx) {
    const name = (input.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const client = new ClearbitClient(ctx);
    return await client.request(COMPANY_LOOKUP_HOST, "/v1/domains/find", { query: { name } });
  },
};

export default action;
