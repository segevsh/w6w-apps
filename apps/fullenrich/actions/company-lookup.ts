import type { ActionDefinition } from "@w6w/types";
import { compact, FullEnrichClient } from "../lib/client.ts";

interface Input {
  domain?: string;
  professionalNetworkUrl?: string;
  professionalNetworkId?: number;
}

/** `POST /company/lookup` — best single match; `companies` is empty when nothing matches. */
const companyLookup: ActionDefinition<Input> = {
  key: "company-lookup",
  type: "read",
  resource: "company",
  title: "Look Up Company",
  description: "Look up one company by domain or LinkedIn URL/ID. Returns the best match, or none.",
  params: [
    { key: "domain", label: "Domain", type: "string" },
    { key: "professionalNetworkUrl", label: "Company LinkedIn URL", type: "string" },
    { key: "professionalNetworkId", label: "Company LinkedIn ID", type: "number" },
  ],
  output: [
    { key: "company", type: "object", label: "Best matching company (null if none)" },
    { key: "credits", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    const res = await new FullEnrichClient(ctx).request<
      { companies?: unknown[]; metadata?: { credits?: number } }
    >("POST", "/company/lookup", {
      body: compact({
        domain: input.domain || undefined,
        professional_network_url: input.professionalNetworkUrl || undefined,
        professional_network_id: input.professionalNetworkId,
      }),
    });
    return { company: res.companies?.[0] ?? null, credits: res.metadata?.credits ?? null };
  },
};

export default companyLookup;
