import type { ActionDefinition } from "@w6w/types";
import { SupadataClient } from "../lib/client.ts";

const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description:
    "Read the organization id, plan and credits used in the current billing period. Free, and " +
    "exempt from the rate limit.",
  params: [],
  output: [
    { key: "organizationId", type: "string", label: "Organization id" },
    { key: "plan", type: "string", label: "Plan name" },
    { key: "maxCredits", type: "number", label: "Credits in the period" },
    { key: "usedCredits", type: "number", label: "Credits used" },
  ],

  async execute(_input, ctx) {
    return await new SupadataClient(ctx).json("/me");
  },
};

export default accountGet;
