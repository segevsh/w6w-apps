import type { ActionDefinition } from "@w6w/types";
import { ClearbitClient, compact, PERSON_HOST } from "../lib/client.ts";

interface Input {
  email: string;
  givenName?: string;
  familyName?: string;
  ipAddress?: string;
}

/**
 * `GET person-stream.clearbit.com/v2/combined/find?email=...` — the Combined
 * Enrichment API: one call returns both the person AND, when the person's
 * employer can be resolved, their company in a single response
 * (`{ person, company }`). Spends a credit per successful match, same as
 * `enrich-person`.
 *
 * Confirmed against the official `clearbit-node` SDK source
 * (`src/enrichment.js`): the `Enrichment` resource is built with `{api:
 * 'person', version: 2}` and its `find` method calls `this.get('/combined/find',
 * options)` whenever `options.email` (not `options.domain`) is set — i.e. this
 * is a real, first-party endpoint on the `person` host, not a client-side
 * convenience that chains two calls.
 */
const action: ActionDefinition<Input> = {
  key: "enrich-combined",
  type: "read",
  resource: "person",
  title: "Enrich Person + Company",
  description:
    "Look up a person AND their employer's company data in one call, given only an email address.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      placeholder: "name@example.com",
    },
    {
      key: "givenName",
      label: "Given Name",
      type: "string",
      advanced: true,
      hint: "Improves match rate.",
    },
    {
      key: "familyName",
      label: "Family Name",
      type: "string",
      advanced: true,
      hint: "Improves match rate.",
    },
    {
      key: "ipAddress",
      label: "IP Address",
      type: "string",
      advanced: true,
      hint: "Improves match rate.",
    },
  ],
  output: [
    { key: "person", type: "object", label: "Person" },
    { key: "company", type: "object", label: "Company" },
  ],

  async execute(input, ctx) {
    const email = (input.email ?? "").trim();
    if (!email) throw new Error("`email` is required");
    const client = new ClearbitClient(ctx);
    return await client.request(PERSON_HOST, "/v2/combined/find", {
      query: compact({
        email,
        given_name: input.givenName,
        family_name: input.familyName,
        ip_address: input.ipAddress,
      }),
    });
  },
};

export default action;
