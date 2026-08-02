import type { ActionDefinition } from "@w6w/types";
import { ClearbitClient, compact, PERSON_HOST } from "../lib/client.ts";

interface Input {
  email: string;
  givenName?: string;
  familyName?: string;
  company?: string;
  companyDomain?: string;
  ipAddress?: string;
  location?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
}

/**
 * `GET person-stream.clearbit.com/v2/people/find?email=...` — the Person
 * Enrichment API. Spends a paid credit per successful match.
 *
 * `email` is the only required field; every other field is an optional
 * match-quality hint Clearbit's own docs recommend passing when you already
 * have them (`given_name`/`family_name` in particular are called out as
 * "strongly recommended" to improve match rates). Query param names verified
 * against n8n's production Clearbit node (`Clearbit.node.ts`), which maps
 * these same camelCase UI fields to the exact snake_case query keys used
 * here — a second, independent confirmation of the official SDK's shape.
 */
const action: ActionDefinition<Input> = {
  key: "enrich-person",
  type: "read",
  resource: "person",
  title: "Enrich Person",
  description: "Look up a person's name, role, location and social profiles by email address.",
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
    { key: "company", label: "Company Name", type: "string", advanced: true },
    { key: "companyDomain", label: "Company Domain", type: "string", advanced: true },
    {
      key: "ipAddress",
      label: "IP Address",
      type: "string",
      advanced: true,
      hint: "Improves match rate.",
    },
    {
      key: "location",
      label: "Location",
      type: "string",
      advanced: true,
      hint: "City or country.",
    },
    { key: "linkedin", label: "LinkedIn URL", type: "string", advanced: true },
    { key: "twitter", label: "Twitter Handle", type: "string", advanced: true },
    { key: "facebook", label: "Facebook URL", type: "string", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "name", type: "object", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "employment", type: "object", label: "Employment" },
    { key: "location", type: "string", label: "Location" },
    { key: "linkedin", type: "object", label: "LinkedIn" },
    { key: "twitter", type: "object", label: "Twitter" },
  ],

  async execute(input, ctx) {
    const email = (input.email ?? "").trim();
    if (!email) throw new Error("`email` is required");
    const client = new ClearbitClient(ctx);
    return await client.request(PERSON_HOST, "/v2/people/find", {
      query: compact({
        email,
        given_name: input.givenName,
        family_name: input.familyName,
        company: input.company,
        company_domain: input.companyDomain,
        ip_address: input.ipAddress,
        location: input.location,
        linkedin: input.linkedin,
        twitter: input.twitter,
        facebook: input.facebook,
      }),
    });
  },
};

export default action;
