import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Rate-limit headroom on this credential, read off `GET /2/users/me`.
 *
 * X has no aggregate rate-limit endpoint the way GitHub's `/rate_limit` is —
 * every v2 response instead carries its own `x-rate-limit-limit` /
 * `-remaining` / `-reset` headers, scoped to that endpoint's own 15-minute
 * window (docs.x.com/x-api/fundamentals/rate-limits, checked 2026-07-31).
 * So this check reads the headers off the cheapest authenticated call this
 * app already needs (`users.read`, no params) and reports on that one
 * bucket — it is NOT a global answer, which is why the component is named
 * for the endpoint it came from rather than "api".
 *
 * This is also a different question from the dollar-credit balance X's 2026
 * pay-per-use pricing meters (see the App README) — that balance is not
 * exposed anywhere in the API to poll, only in the developer console, so it
 * cannot be part of this check.
 */
const BUCKET = "users-me";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom (users.read bucket)",
  description:
    "Reads x-rate-limit-* off GET /2/users/me. Reports only that endpoint's 15-minute window — X exposes no aggregate quota endpoint, and this does not reflect the pay-per-use dollar-credit balance (see README).",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me`);
    if (!res.ok && res.status !== 429) {
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }

    const limit = res.headers.get("x-rate-limit-limit");
    const remaining = res.headers.get("x-rate-limit-remaining");
    const reset = res.headers.get("x-rate-limit-reset");
    if (limit === null || remaining === null) {
      return { state: "unknown", message: "response carried no x-rate-limit-* headers" };
    }

    const limitNum = Number(limit);
    const remainingNum = Number(remaining);
    const state: HealthState = remainingNum <= 0
      ? "down"
      : limitNum > 0 && remainingNum / limitNum < 0.1
      ? "degraded"
      : "ok";

    return {
      state,
      components: {
        [BUCKET]: { state, message: `${remainingNum}/${limitNum} remaining` },
      },
      quota: [{
        id: BUCKET,
        limit: limitNum,
        remaining: remainingNum,
        resetAt: reset ? new Date(Number(reset) * 1000).toISOString() : undefined,
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
