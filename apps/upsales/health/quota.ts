/**
 * Rate-limit headroom for this API key.
 *
 * Upsales documents `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`
 * (seconds until the window resets) on **every** response, reflecting "whichever window is
 * currently closest to its limit" — 10 s / 10 min / 1 h fixed windows, counted per key (and a
 * separate write budget). The unsigned probe in `api` measured `Limit: 40, Remaining: 39,
 * Reset: 10`; a signed call reports the key's own windows. This check reads those headers
 * from a signed `GET /self` (which consumes one request).
 *
 * Remaining <= 0 is `down` (the next call is a 429), under 10% is `degraded`. Missing or
 * non-numeric headers report `unknown` rather than guessing.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

export const PROBE_URL = `${API_BASE}${API_PREFIX}/self`;
export const WARN_FRACTION = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Remaining requests in the tightest rate-limit window for this key, read from " +
    "the X-RateLimit-* headers.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const limit = Number(res.headers.get("x-ratelimit-limit"));
    const remainingRaw = res.headers.get("x-ratelimit-remaining");
    const remaining = Number(remainingRaw);
    const reset = Number(res.headers.get("x-ratelimit-reset"));

    if (!res.headers.get("x-ratelimit-limit") || remainingRaw === null) {
      return { state: "unknown", message: `no X-RateLimit headers on a ${res.status} response` };
    }
    if (!Number.isFinite(limit) || !Number.isFinite(remaining) || limit <= 0) {
      return { state: "unknown", message: "X-RateLimit headers were not numeric" };
    }

    let state: HealthState = "ok";
    let message: string | undefined;
    if (remaining <= 0) {
      state = "down";
      message = "rate-limit window exhausted; requests will answer 429 until it resets";
    } else if (remaining / limit < WARN_FRACTION) {
      state = "degraded";
      message = `${remaining} of ${limit} requests left in the tightest window`;
    }

    return {
      state,
      message,
      quota: [{
        id: "tightest-window",
        limit,
        remaining: Math.max(0, remaining),
        unit: "requests",
        ...(Number.isFinite(reset) && reset >= 0
          ? { resetAt: new Date(Date.now() + reset * 1000).toISOString() }
          : {}),
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
