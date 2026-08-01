import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Is there API quota left? — read from UptimeRobot's own documented
 * rate-limit response headers.
 *
 * Verified directly against UptimeRobot's own v2 docs
 * (`uptimerobot.com/api/legacy/`, fetched 2026-08-01, "Rate Limits"
 * section): every response carries `X-RateLimit-Limit`,
 * `X-RateLimit-Remaining`, `X-RateLimit-Reset` (epoch seconds), and
 * `Retry-After` (on 429). Limits are plan-based — Free: 10 req/min, paid:
 * `monitor_limit * 2` req/min capped at 5000 req/min — so this check rides
 * along on the cheapest authenticated call available (`getAccountDetails`,
 * the same endpoint the derived `auth:api-key` credential check already
 * uses) rather than spending a separate request just to read headers.
 *
 * `kind: "quota"` defaults `credential` to `"signed"` — the request goes
 * through `sign` exactly like an Action's — and `scope` to `"connection"`,
 * since rate limits in UptimeRobot are per API key, not global.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate limit headroom",
  description: "Reads UptimeRobot's X-RateLimit-* response headers off a getAccountDetails call.",
  kind: "quota",
  severity: "informational",

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/getAccountDetails`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "", // sign() injects api_key + format=json
    });

    const limit = res.headers.get("x-ratelimit-limit");
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");

    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      return {
        state: "down",
        message: retryAfter ? `rate limited; retry after ${retryAfter}s` : "rate limited",
        quota: [{
          id: "requests",
          limit: limit ? Number(limit) : undefined,
          remaining: 0,
          unit: "requests/min",
        }],
      };
    }

    if (!res.ok) {
      return { state: "unknown", message: `getAccountDetails returned ${res.status}` };
    }

    // UptimeRobot's docs describe these headers but a live account may not
    // echo them on every plan/endpoint — treat their absence as "cannot know"
    // rather than fabricating a reading.
    if (remaining === null || limit === null) {
      return { state: "unknown", message: "response carried no X-RateLimit-* headers" };
    }

    const remainingNum = Number(remaining);
    const limitNum = Number(limit);
    const resetAt = reset ? new Date(Number(reset) * 1000).toISOString() : undefined;

    return {
      state: Number.isFinite(remainingNum) && remainingNum <= 0 ? "degraded" : "ok",
      quota: [{
        id: "requests",
        limit: Number.isFinite(limitNum) ? limitNum : undefined,
        remaining: Number.isFinite(remainingNum) ? remainingNum : undefined,
        resetAt,
        unit: "requests/min",
      }],
    };
  },
};

export default quota;
