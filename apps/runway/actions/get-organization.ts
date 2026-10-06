import type { ActionDefinition } from "@w6w/types";
import { RunwayClient } from "../lib/client.ts";

/** `GET /v1/organization` — free; the credit balance and usage tier of the key's organization. */
const getOrganization: ActionDefinition = {
  key: "get-organization",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Read the credit balance, usage tier and per-model usage of the organization " +
    "that owns the API key. Free.",
  params: [],
  output: [
    { key: "creditBalance", type: "number", label: "Credit balance" },
    { key: "maxMonthlyCreditSpend", type: "number", label: "Tier monthly credit spend ceiling" },
    { key: "tier", type: "object", label: "Usage tier (limits per model)" },
    { key: "usage", type: "object", label: "Usage per model" },
  ],

  async execute(_input, ctx) {
    const { data } = await new RunwayClient(ctx).request("/v1/organization");
    const d = (data ?? {}) as {
      creditBalance?: number;
      tier?: { maxMonthlyCreditSpend?: number };
      usage?: unknown;
    };
    return {
      creditBalance: d.creditBalance,
      maxMonthlyCreditSpend: d.tier?.maxMonthlyCreditSpend,
      tier: d.tier,
      usage: d.usage,
    };
  },
};

export default getOrganization;
