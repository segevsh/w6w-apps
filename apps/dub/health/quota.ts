/**
 * Rate-limit headroom on THIS key. Dub documents `X-RateLimit-Limit`,
 * `X-RateLimit-Remaining` and `X-RateLimit-Reset` (UTC epoch SECONDS) plus
 * `Retry-After`; the allowance is per minute by plan (60 Free, 600 Pro, 1,200
 * Business, 3,000 Advanced) even though the header table says "per hour".
 * The headers were not present on the unauthenticated 401s measured on
 * 2026-10-06, so a response without them reports `unknown`, never an invented
 * count. Probe: signed `GET /links?pageSize=1`.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Headroom is context, not a verdict. */
export function headroom(remaining: number, limit: number): HealthState {
  if (remaining <= 0) return "down";
  if (limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Requests left in this key's rate-limit window, read from the `X-RateLimit-*` headers of a signed `GET /links?pageSize=1`.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/links?pageSize=1`, {
      headers: { accept: "application/json" },
    });
    const h = res.headers;
    const limit = num(h.get("x-ratelimit-limit"));
    const remaining = num(h.get("x-ratelimit-remaining"));
    const reset = num(h.get("x-ratelimit-reset"));
    const retryAfter = num(h.get("retry-after"));
    const resetAt = reset !== undefined
      ? new Date(reset * 1000).toISOString()
      : retryAfter !== undefined
      ? new Date(Date.now() + retryAfter * 1000).toISOString()
      : undefined;

    if (res.status === 429) {
      return {
        state: "down",
        message: "rate limited",
        quota: [{ id: "requests", limit, remaining: remaining ?? 0, resetAt, unit: "requests" }],
        ttlSeconds: 60,
      };
    }
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };
    if (remaining === undefined) {
      return {
        state: "unknown",
        message: "response carried no X-RateLimit-Remaining header",
        ttlSeconds: 60,
      };
    }
    return {
      state: headroom(remaining, limit ?? 0),
      quota: [{ id: "requests", limit, remaining, resetAt, unit: "requests" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
