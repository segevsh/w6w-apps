import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  companyDomain?: string;
  companyName?: string;
  companyLocation?: string;
  enrichProfile?: string;
}

/** `GET /company/resolve` */
const companyLookup: ActionDefinition<Input> = {
  key: "company-lookup",
  type: "read",
  resource: "company",
  title: "Look Up Company",
  description:
    "Find a company's profile URL from its name and/or domain (2 credits, charged on any 200 response including no match).",
  params: [
    {
      key: "companyDomain",
      label: "Company domain",
      type: "string",
      hint: "Either domain or name is required.",
    },
    { key: "companyName", label: "Company name", type: "string" },
    {
      key: "companyLocation",
      label: "Company location",
      type: "string",
      hint: "ISO 3166-1 alpha-2 country code.",
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
    { key: "url", type: "string", label: "Matched company profile URL (null if none)" },
    { key: "profile", type: "object", label: "Cached profile when enrichment was requested" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/company/resolve", {
      company_domain: input.companyDomain,
      company_name: input.companyName,
      company_location: input.companyLocation,
      enrich_profile: input.enrichProfile,
    });
    return {
      url: (res as { url?: string | null }).url ?? null,
      profile: (res as { profile?: unknown }).profile ?? null,
    };
  },
};

export default companyLookup;
