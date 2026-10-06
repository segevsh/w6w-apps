import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  role: string;
  companyName: string;
  enrichProfile?: string;
}

/** `GET /find/company/role/` */
const personRoleLookup: ActionDefinition<Input> = {
  key: "person-role-lookup",
  type: "read",
  resource: "person",
  title: "Look Up Person by Role",
  description:
    "Return the person who most closely matches a role at a company, for example the CTO of Apple (3 credits, charged on any 200 response).",
  params: [
    { key: "role", label: "Role", type: "string", required: true, hint: "For example ceo or cto." },
    { key: "companyName", label: "Company name", type: "string", required: true },
    {
      key: "enrichProfile",
      label: "Enrich with cached profile",
      type: "select",
      hint: "enrich adds the cached profile for 1 extra credit.",
      options: [{ value: "skip", label: "skip" }, { value: "enrich", label: "enrich" }],
    },
  ],
  output: [
    { key: "linkedinProfileUrl", type: "string", label: "Matched profile URL (null if none)" },
    { key: "profile", type: "object", label: "Cached profile when enrichment was requested" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/find/company/role/", {
      role: input.role,
      company_name: input.companyName,
      enrich_profile: input.enrichProfile,
    });
    return {
      linkedinProfileUrl: (res as { linkedin_profile_url?: string | null }).linkedin_profile_url ??
        null,
      profile: (res as { profile?: unknown }).profile ?? null,
    };
  },
};

export default personRoleLookup;
