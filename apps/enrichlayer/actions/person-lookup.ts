import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  firstName: string;
  companyDomain: string;
  lastName?: string;
  title?: string;
  location?: string;
  similarityChecks?: string;
  enrichProfile?: string;
}

/** `GET /profile/resolve` */
const personLookup: ActionDefinition<Input> = {
  key: "person-lookup",
  type: "read",
  resource: "person",
  title: "Look Up Person by Name and Company",
  description:
    "Find a person's profile URL from a first name and a company name or domain (2 credits). Credits are charged even on a null result unless similarity checks are skipped.",
  params: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "companyDomain", label: "Company name or domain", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "title", label: "Current job title", type: "string" },
    { key: "location", label: "Location", type: "string", hint: "Country, city or state name." },
    {
      key: "similarityChecks",
      label: "Similarity checks",
      type: "select",
      hint:
        "include (default) discards false positives but charges even on null; skip charges nothing when no result is returned.",
      options: [{ value: "include", label: "include" }, { value: "skip", label: "skip" }],
    },
    {
      key: "enrichProfile",
      label: "Enrich with cached profile",
      type: "select",
      hint: "enrich adds the cached profile for 1 extra credit.",
      options: [{ value: "skip", label: "skip" }, { value: "enrich", label: "enrich" }],
    },
  ],
  output: [
    { key: "url", type: "string", label: "Matched profile URL (null if none)" },
    { key: "profile", type: "object", label: "Cached profile when enrichment was requested" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/profile/resolve", {
      first_name: input.firstName,
      company_domain: input.companyDomain,
      last_name: input.lastName,
      title: input.title,
      location: input.location,
      similarity_checks: input.similarityChecks,
      enrich_profile: input.enrichProfile,
    });
    return {
      url: (res as { url?: string | null }).url ?? null,
      profile: (res as { profile?: unknown }).profile ?? null,
    };
  },
};

export default personLookup;
