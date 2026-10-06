import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const num = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

/**
 * Hourly API allowance, read from `GET /v1/ratelimit` — an endpoint the
 * reference says "does not count against your rate limit", so the check spends
 * nothing it measures. The body is `{limit, remaining, reset, formatted_reset}`
 * with every number a string; `reset` is UTC epoch seconds.
 *
 * Signed and connection-scoped: the allowance is per account and the call needs
 * the credential. It stays informational — running low is a warning, not an
 * outage of the vendor.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Requests remaining in the current hourly window, from `GET /v1/ratelimit` (which is not itself metered).",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { domain?: string };
    if (!display.domain) {
      return { state: "unknown", message: "connection records no domain" };
    }
    const res = await ctx.fetch(`${baseUrl(display.domain)}/ratelimit`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { limit?: unknown; remaining?: unknown; reset?: unknown }
      | null;
    const limit = num(body?.limit);
    const remaining = num(body?.remaining);
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no `remaining` count" };
    }
    const reset = num(body?.reset);
    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "hourly",
        limit,
        remaining,
        unit: "requests",
        resetAt: reset === undefined ? undefined : new Date(reset * 1000).toISOString(),
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
