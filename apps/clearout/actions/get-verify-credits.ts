import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient } from "../lib/client.ts";

/**
 * `GET /email_verify/getcredits` — the older credits endpoint, kept because it is the only
 * one that reports the daily verify limit.
 */
const getVerifyCredits: ActionDefinition = {
  key: "get-verify-credits",
  type: "read",
  resource: "account",
  title: "Get Verify Credits and Daily Limit",
  description: "Read available credits plus the daily verify limit and when it resets. Free.",
  params: [],
  output: [
    { key: "availableCredits", type: "number", label: "Available credits" },
    { key: "credits", type: "object", label: "available, subs, daily limit, reset date, total" },
    { key: "lowBalanceThreshold", type: "number", label: "Low-credit alert threshold" },
  ],

  async execute(_input, ctx) {
    const { data } = await new ClearoutClient(ctx).request("/email_verify/getcredits");
    const d = (data ?? {}) as {
      available_credits?: number;
      credits?: unknown;
      low_credit_balance_min_threshold?: number;
    };
    return {
      availableCredits: d.available_credits,
      credits: d.credits,
      lowBalanceThreshold: d.low_credit_balance_min_threshold,
    };
  },
};

export default getVerifyCredits;
