import type { ActionDefinition } from "@w6w/types";
import { CoinGeckoClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "get-api-usage",
  type: "read",
  resource: "account",
  title: "Get API Usage",
  description:
    "Plan name, rate limit and monthly call-credit usage for the connected key (GET /key). " +
    "Paid plans only — a Demo key is refused.",
  params: [],
  output: [
    { key: "plan", type: "string", label: "Plan name" },
    { key: "rate_limit_request_per_minute", type: "number", label: "Rate limit per minute" },
    { key: "monthly_call_credit", type: "number", label: "Monthly call credits" },
    { key: "current_total_monthly_calls", type: "number", label: "Credits used this month" },
    { key: "current_remaining_monthly_calls", type: "number", label: "Credits remaining" },
  ],

  async execute(_input, ctx) {
    return await new CoinGeckoClient(ctx).get("/key");
  },
};

export default action;
