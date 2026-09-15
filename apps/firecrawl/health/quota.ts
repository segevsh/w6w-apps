/**
 * How many Firecrawl credits does this team have left?
 *
 * `GET /team/credit-usage` is the same endpoint `auth/api-key.ts` uses as the
 * credential-liveness probe — deliberately, not by coincidence: it is the one
 * endpoint in this app's covered surface that needs a credential and returns
 * nothing secret, which makes it simultaneously the right liveness probe and
 * the only source of quota headroom. `minIntervalSeconds` keeps the combined
 * cost to one call a minute.
 *
 * `remainingCredits` at or below zero means work will start failing with
 * `402 Payment required` (documented on every billed endpoint's response
 * schema), so that is reported `down`, not merely `degraded`. Firecrawl
 * publishes no separate "requests per minute remaining" signal the way some
 * other APIs in this pack do — credits are the one meter that matters here.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";

export const CREDIT_USAGE_URL = "https://api.firecrawl.dev/v2/team/credit-usage";

/** Consumption at or above this fraction of the plan is worth flagging. */
export const WARN_FRACTION = 0.9;

interface CreditUsageBody {
  success?: boolean;
  data?: {
    remainingCredits?: number;
    planCredits?: number;
    billingPeriodStart?: string | null;
    billingPeriodEnd?: string | null;
  };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit headroom",
  description: "Remaining vs. plan credits, read from GET /team/credit-usage.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(CREDIT_USAGE_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return {
        state: "unknown",
        message: `Firecrawl returned ${res.status} for /team/credit-usage`,
      };
    }

    const body = await res.json().catch(() => null) as CreditUsageBody | null;
    const data = body?.data;
    if (!data || typeof data.remainingCredits !== "number") {
      return { state: "unknown", message: "Credit usage response carried no remainingCredits" };
    }

    const remaining = data.remainingCredits;
    const limit = typeof data.planCredits === "number" ? data.planCredits : undefined;
    const quotaReading: HealthQuota = {
      id: "credits",
      remaining: Math.max(0, remaining),
      limit,
      unit: "credits",
      ...(data.billingPeriodEnd ? { resetAt: data.billingPeriodEnd } : {}),
    };

    if (remaining <= 0) {
      return {
        state: "down",
        message: `0 credits remaining of ${limit ?? "?"} — requests will fail with 402`,
        quota: [quotaReading],
        ttlSeconds: 60,
      };
    }
    if (limit && limit > 0 && (limit - remaining) / limit >= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `${remaining}/${limit} credits remaining (${
          Math.round((remaining / limit) * 100)
        }%)`,
        quota: [quotaReading],
        ttlSeconds: 60,
      };
    }
    return { state: "ok", quota: [quotaReading], ttlSeconds: 60 };
  },
};

export default quota;
