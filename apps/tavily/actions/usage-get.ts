import type { ActionDefinition } from "@w6w/types";
import { TavilyClient } from "../lib/client.ts";

/** `GET /usage` — credit usage for this key and the account's plan. Costs no credits. */
const usageGet: ActionDefinition<Record<string, never>> = {
  key: "usage-get",
  type: "read",
  resource: "usage",
  title: "Get Usage",
  description:
    "Get credit usage for this API key and the account plan in the current billing cycle.",
  params: [],
  output: [
    { key: "key", type: "object", label: "Key usage and limit" },
    { key: "account", type: "object", label: "Plan, plan usage/limit, pay-as-you-go usage/limit" },
  ],

  execute(_input, ctx) {
    return new TavilyClient(ctx).json("/usage");
  },
};

export default usageGet;
