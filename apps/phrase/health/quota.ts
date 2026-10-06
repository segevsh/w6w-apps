import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_PREFIX, HOSTS, regionFromConnection, USER_AGENT } from "../lib/client.ts";

/**
 * Rate-limit headroom, read off `X-Rate-Limit-*` response headers.
 *
 * Phrase's documented limit is 1000 requests per 5 minutes and 4 concurrent
 * requests per user (plan-dependent), and every response — not just a 429 — carries
 * `X-Rate-Limit-Limit`, `-Remaining` and `-Reset` (unix seconds). The probe is
 * `GET /v2/user`, which needs a credential and returns no credential material; it
 * spends one request of the window it reports on. Informational: running low is a
 * throttle that recovers at reset, never an outage.
 */
const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const num = (v: string | null): number | undefined => {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Requests remaining in Phrase's current rate-limit window.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const host = HOSTS[regionFromConnection(ctx.connection)];
    const res = await ctx.fetch(`${host}${API_PREFIX}/user`, {
      headers: { accept: "application/json", "user-agent": USER_AGENT },
    });
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const limit = num(res.headers.get("x-rate-limit-limit"));
    const remaining = num(res.headers.get("x-rate-limit-remaining"));
    const reset = num(res.headers.get("x-rate-limit-reset"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no X-Rate-Limit-* headers" };
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
