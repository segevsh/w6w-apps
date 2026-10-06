import type { ActionDefinition } from "@w6w/types";
import { EzTextingClient } from "../lib/client.ts";

/** `GET /v1/credits` — `{planCredits, anytimeCredits, totalCredits}`. */
const creditBalanceGet: ActionDefinition<Record<string, never>> = {
  key: "credit-balance-get",
  type: "read",
  resource: "account",
  title: "Get Credit Balance",
  description: "Get the account's remaining plan and anytime credits.",
  params: [],
  output: [
    { key: "planCredits", type: "number", label: "Plan credits" },
    { key: "anytimeCredits", type: "number", label: "Anytime credits" },
    { key: "totalCredits", type: "number", label: "Total credits" },
  ],

  async execute(_input, ctx) {
    return (await new EzTextingClient(ctx).json("/credits")) ?? {};
  },
};

export default creditBalanceGet;
