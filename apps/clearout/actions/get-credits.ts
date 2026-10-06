import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient } from "../lib/client.ts";

/** `GET /account/credits` — free, no credential material in the body. */
const getCredits: ActionDefinition = {
  key: "get-credits",
  type: "read",
  resource: "account",
  title: "Get Remaining Credits",
  description: "Read the account's remaining credits, split by pay-as-you-go, subscription " +
    "and bonus, and the low-balance alert threshold. Free.",
  params: [],
  output: [
    { key: "totalRemaining", type: "number", label: "Total remaining credits" },
    { key: "payAsYouGo", type: "number", label: "Pay-as-you-go credits" },
    { key: "subscription", type: "number", label: "Subscription credits" },
    { key: "bonus", type: "number", label: "Bonus credits" },
    { key: "lowBalanceThreshold", type: "number", label: "Low-credit alert threshold" },
  ],

  async execute(_input, ctx) {
    const { data } = await new ClearoutClient(ctx).request("/account/credits");
    const d = (data ?? {}) as {
      total_remaining_credits?: number;
      plan_remaining_credits?: Record<string, number>;
      low_credit_balance_min_threshold?: number;
    };
    return {
      totalRemaining: d.total_remaining_credits,
      payAsYouGo: d.plan_remaining_credits?.["pay-as-you-go"],
      subscription: d.plan_remaining_credits?.subscription,
      bonus: d.plan_remaining_credits?.bonus,
      lowBalanceThreshold: d.low_credit_balance_min_threshold,
    };
  },
};

export default getCredits;
