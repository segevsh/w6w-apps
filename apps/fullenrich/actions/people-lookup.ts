import type { ActionDefinition } from "@w6w/types";
import { compact, FullEnrichClient } from "../lib/client.ts";

interface Input {
  personName?: string;
  personProfessionalNetworkUrl?: string;
  personProfessionalNetworkId?: number;
  companyDomain?: string;
  companyProfessionalNetworkUrl?: string;
  companyProfessionalNetworkId?: number;
}

/** `POST /people/lookup` — best single match; `people` is empty when nothing matches. */
const peopleLookup: ActionDefinition<Input> = {
  key: "people-lookup",
  type: "read",
  resource: "people",
  title: "Look Up Person",
  description:
    "Look up one person by LinkedIn URL/ID (most reliable) or by full name plus a company identifier. Returns the best match, or none.",
  params: [
    {
      key: "personProfessionalNetworkUrl",
      label: "Person LinkedIn URL",
      type: "string",
    },
    { key: "personProfessionalNetworkId", label: "Person LinkedIn ID", type: "number" },
    { key: "personName", label: "Full name", type: "string" },
    {
      key: "companyDomain",
      label: "Company domain",
      type: "string",
      hint: "Disambiguates a name lookup.",
    },
    { key: "companyProfessionalNetworkUrl", label: "Company LinkedIn URL", type: "string" },
    { key: "companyProfessionalNetworkId", label: "Company LinkedIn ID", type: "number" },
  ],
  output: [
    { key: "person", type: "object", label: "Best matching person (null if none)" },
    { key: "credits", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    const res = await new FullEnrichClient(ctx).request<
      { people?: unknown[]; metadata?: { credits?: number } }
    >("POST", "/people/lookup", {
      body: compact({
        person_name: input.personName || undefined,
        person_professional_network_url: input.personProfessionalNetworkUrl || undefined,
        person_professional_network_id: input.personProfessionalNetworkId,
        company_domain: input.companyDomain || undefined,
        company_professional_network_url: input.companyProfessionalNetworkUrl || undefined,
        company_professional_network_id: input.companyProfessionalNetworkId,
      }),
    });
    return { person: res.people?.[0] ?? null, credits: res.metadata?.credits ?? null };
  },
};

export default peopleLookup;
