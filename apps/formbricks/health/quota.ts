import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

export const PROBE_URL = `${API_URL}/management/me`;

/** Fraction of the per-minute allowance consumed at which the check reports `degraded`. */
export const WARN_FRACTION = 0.9;

/**
 * Formbricks answers every management call with `x-ratelimit-limit: 100, 100;w=60`
 * (an IETF-style "limit, quota-policy;window" pair — the first number is the limit),
 * `x-ratelimit-remaining: 99` and `x-ratelimit-reset: 52` (seconds until the window
 * resets). Measured 2026-10-06 on unauthenticated 401s; the documented policy is
 * 100 requests/minute per API key. The leading integer is parsed, never the whole value.
 */
export function readHeaders(headers: Headers): { limit?: number; remaining?: number } {
  const num = (name: string) => {
    const m = /^\s*(\d+)/.exec(headers.get(name) ?? "");
    return m ? Number(m[1]) : undefined;
  };
  return { limit: num("x-ratelimit-limit"), remaining: num("x-ratelimit-remaining") };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Per-minute request headroom",
  description: "Remaining share of the 100 requests/minute per-key allowance, from x-ratelimit-*.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    if (res.status === 429) {
      return { state: "down", message: "Formbricks rate limit exhausted (HTTP 429)" };
    }
    // A rejected key is the derived `auth:api-key` check's finding, not a quota verdict.
    if (!res.ok) return { state: "unknown", message: `Formbricks returned ${res.status}` };

    const { limit, remaining } = readHeaders(res.headers);
    if (limit === undefined || remaining === undefined) {
      return { state: "unknown", message: "Response carried no x-ratelimit headers" };
    }
    const entry: HealthQuota = { id: "per-minute-requests", limit, remaining, unit: "requests" };
    let state: HealthState = "ok";
    let message: string | undefined;
    if (limit > 0 && remaining <= 0) {
      state = "down";
      message = "No requests remaining this minute";
    } else if (limit > 0 && (limit - remaining) / limit >= WARN_FRACTION) {
      state = "degraded";
      message = `${remaining} of ${limit} requests remaining this minute`;
    }
    return { state, message, quota: [entry], ttlSeconds: 60 };
  },
};

export default quota;
