import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient } from "../lib/client.ts";
import { mapLead } from "../lib/lead.ts";

interface Input {
  name: string;
}

/** `GET /reverse_lookup/domain?name=` — company details for a domain name. */
const reverseLookupDomain: ActionDefinition<Input> = {
  key: "reverse-lookup-domain",
  type: "read",
  resource: "company",
  title: "Reverse Lookup Domain",
  description: "Find company information (name, LinkedIn page, address) for a domain. Costs a " +
    "credit when a company is found.",
  params: [{
    key: "name",
    label: "Domain",
    type: "string",
    required: true,
    hint: "e.g. stripe.com",
  }],
  output: [
    { key: "name", type: "string", label: "Domain as looked up" },
    { key: "lead", type: "object", label: "Company: name, linkedinUrl, addresses" },
  ],

  async execute(input, ctx) {
    const name = String(input.name ?? "").trim();
    if (!name) throw new Error("name is required");
    const { data } = await new ClearoutClient(ctx).request("/reverse_lookup/domain", {
      query: { name },
    });
    const d = (data ?? {}) as { name?: string; lead?: unknown };
    return { name: d.name ?? name, lead: mapLead(d.lead) };
  },
};

export default reverseLookupDomain;
