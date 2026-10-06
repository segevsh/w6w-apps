import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

export const PROBE_URL = `${API_BASE}${API_PREFIX}/account`;

/** Fraction of the hourly allowance consumed at which the check reports `degraded`. */
export const WARN_FRACTION = 0.9;

/**
 * Hourly request headroom. Baremetrics documents 3,600 requests per hour and
 * says every response carries `X-RateLimit-Limit` and `X-RateLimit-Remaining`
 * (developers.baremetrics.com/reference/rate-limit, verified 2026-10-06). The
 * headers are read off a signed `GET /v1/account` — the same body-free-of-keys
 * probe the credential test uses. A response without the headers is `unknown`,
 * never `ok`: this check does not assume headroom.
 */
export function readHeaders(headers: Headers): { limit?: number; remaining?: number } {
  const num = (name: string) => {
    const raw = headers.get(name);
    if (raw === null || raw.trim() === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  return { limit: num("x-ratelimit-limit"), remaining: num("x-ratelimit-remaining") };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Hourly request headroom",
  description: "Remaining share of the 3,600 requests/hour allowance, from X-RateLimit headers.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    if (res.status === 429) {
      return { state: "down", message: "Baremetrics rate limit exhausted (HTTP 429)" };
    }
    if (!res.ok) return { state: "unknown", message: `Baremetrics returned ${res.status}` };

    const { limit, remaining } = readHeaders(res.headers);
    if (limit === undefined || remaining === undefined) {
      return { state: "unknown", message: "Response carried no X-RateLimit headers" };
    }
    const entry: HealthQuota = { id: "hourly-requests", limit, remaining, unit: "requests" };
    let state: HealthState = "ok";
    let message: string | undefined;
    if (limit > 0 && remaining <= 0) {
      state = "down";
      message = "No requests remaining this hour";
    } else if (limit > 0 && (limit - remaining) / limit >= WARN_FRACTION) {
      state = "degraded";
      message = `${remaining} of ${limit} requests remaining this hour`;
    }
    return { state, message, quota: [entry], ttlSeconds: 60 };
  },
};

export default quota;
