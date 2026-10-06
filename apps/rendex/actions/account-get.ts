import type { ActionDefinition } from "@w6w/types";
import { RendexClient } from "../lib/client.ts";

/**
 * `GET /v1/account` — plan, this month's credit usage and the per-minute rate limit. Free: it
 * never spends a credit. Returns `plan, usage{used, limit, remaining, unlimited, resetsAt},
 * rateLimitPerMinute, upgrade`. Also the credential probe (`auth/api-key.ts`) and the source
 * of the `quota` health check.
 */
const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account Usage",
  description: "Read the plan, monthly credit usage and rate limit. Spends no credit.",
  params: [],
  output: [
    { key: "plan", type: "string", label: "Plan" },
    { key: "usage", type: "object", label: "{used, limit, remaining, unlimited, resetsAt}" },
    { key: "rateLimitPerMinute", type: "number", label: "Requests per minute" },
    { key: "upgrade", type: "object", label: "Recommended upgrade, or null on the top plan" },
  ],

  execute(_input, ctx) {
    return new RendexClient(ctx).json("/account");
  },
};

export default accountGet;
