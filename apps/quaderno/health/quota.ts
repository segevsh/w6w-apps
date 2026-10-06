/**
 * Rate-limit headroom on THIS credential — Quaderno.
 *
 * Quaderno allows 100 calls per 15 seconds and puts `X-RateLimit-Limit`,
 * `X-RateLimit-Remaining` and `X-RateLimit-Reset` (UTC epoch) on every
 * successful response (OpenAPI spec, "Rate Limiting"). Probe: `GET /ping`,
 * the documented credential check — it costs nothing and echoes nothing.
 *
 * `severity: "informational"`: a 15-second window refills before anyone can
 * act on it, so it is shown and never worsens the verdict. Signed on the
 * app's own egress allowlist (`*.quadernoapp.com`); no `network.allow` here.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Calls remaining in the current 15-second window, from `X-RateLimit-*` on `/ping`.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { account?: string };
    if (!display.account) return { state: "unknown", message: "connection records no account" };

    const res = await ctx.fetch(`${baseUrl(display.account)}/ping`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no X-RateLimit-* headers" };
    }
    const reset = num(res.headers.get("x-ratelimit-reset"));
    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "window",
        limit,
        remaining,
        unit: "requests",
        resetAt: reset === undefined ? undefined : new Date(reset * 1000).toISOString(),
      }],
      ttlSeconds: 15,
    };
  },
};

export default quota;
