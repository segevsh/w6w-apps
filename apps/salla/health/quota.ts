import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Salla's "Rate Limiting" guide documents four response headers on every
 * request — `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
 * (UTC epoch seconds) and `Retry-After` — against a per-plan budget (Plus 120,
 * Pro 360, Special 720 per minute, a leaky bucket refilling 1 per second).
 * This check spends one `GET /store/info` (the cheapest call that needs only
 * `settings.read`) and reads those headers off whatever comes back.
 *
 * The headers' presence on an error response is not documented, so their
 * absence is `unknown`, not a failure. Customer endpoints additionally have
 * their own 500-per-10-minutes cap that no header reports.
 *
 * `severity: "informational"`: headroom is advice, not an outage.
 */
const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function headroom(remaining?: number, limit?: number): HealthState {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Requests remaining in the current minute, read off X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset on a GET /store/info.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/store/info`, {
      headers: { accept: "application/json" },
    });
    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    const reset = num(res.headers.get("x-ratelimit-reset"));
    if (remaining === undefined) {
      return {
        state: "unknown",
        message: `response carried no X-RateLimit-Remaining header (HTTP ${res.status})`,
      };
    }
    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests",
        limit,
        remaining,
        resetAt: reset !== undefined ? new Date(reset * 1000).toISOString() : undefined,
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
