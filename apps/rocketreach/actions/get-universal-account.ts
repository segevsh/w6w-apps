import type { ActionDefinition } from "@w6w/types";
import { RocketReachClient } from "../lib/client.ts";

/**
 * `GET /universal/account/` — the Universal Credits account. The vendor's
 * response includes `api_key` (the caller's own key); this action never returns
 * it, so a workflow run record cannot capture the credential.
 */
const getUniversalAccount: ActionDefinition = {
  key: "get-universal-account",
  type: "read",
  resource: "account",
  title: "Get Universal Account",
  description: "Read a Universal Credits account: owner, plan, credits allocated / used / " +
    "remaining, usage by credit action and rate limits. The API key in the vendor's response is " +
    "deliberately dropped. Only for accounts on Universal Credits.",
  params: [],
  output: [
    { key: "id", type: "number", label: "RocketReach user ID" },
    { key: "email", type: "string", label: "Account email" },
    { key: "state", type: "string", label: "anonymous, test_user or registered" },
    { key: "plan", type: "object", label: "Plan id, name and limits" },
    {
      key: "creditUsage",
      type: "object",
      label: "credits_allocated, credits_used, credits_remaining",
    },
    { key: "creditUsageByAction", type: "array", label: "Usage per credit action" },
    { key: "dailyApiNumCalls", type: "number", label: "API calls made today" },
    { key: "dailyApiLimit", type: "string", label: "Daily API call limit" },
    { key: "rateLimits", type: "array", label: "Per action and window" },
  ],

  async execute(_input, ctx) {
    const { body } = await new RocketReachClient(ctx).request("/universal/account/");
    const a = (body ?? {}) as Record<string, unknown>;
    return {
      id: a.id,
      firstName: a.first_name ?? null,
      lastName: a.last_name ?? null,
      email: a.email ?? null,
      state: a.state ?? null,
      plan: a.plan ?? null,
      creditUsage: a.credit_usage ?? null,
      creditUsageByAction: Array.isArray(a.credit_usage_by_action) ? a.credit_usage_by_action : [],
      dailyApiNumCalls: a.daily_api_num_calls ?? null,
      dailyApiLimit: a.daily_api_limit ?? null,
      rateLimits: Array.isArray(a.rate_limits) ? a.rate_limits : [],
    };
  },
};

export default getUniversalAccount;
