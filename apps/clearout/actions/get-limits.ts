import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient } from "../lib/client.ts";

/**
 * `GET /account/limits` — the vendor documents every figure as a STRING (`total`,
 * `remaining`), so they are passed through untouched rather than coerced.
 */
const getLimits: ActionDefinition = {
  key: "get-limits",
  type: "read",
  resource: "account",
  title: "Get Service Limits",
  description: "Read the Email Verifier API rate limit and bulk-verify concurrency limit " +
    "(total and remaining). Free.",
  params: [],
  output: [
    { key: "apiRateLimit", type: "object", label: "total, remaining, next_limit_reset" },
    { key: "bulkVerifyConcurrencyLimit", type: "object", label: "total, remaining" },
  ],

  async execute(_input, ctx) {
    const { data } = await new ClearoutClient(ctx).request("/account/limits");
    const v = ((data ?? {}) as { email_verify?: Record<string, unknown> }).email_verify ?? {};
    return {
      apiRateLimit: v.api_rate_limit ?? null,
      bulkVerifyConcurrencyLimit: v.bulk_verify_concurrency_limit ?? null,
    };
  },
};

export default getLimits;
