/**
 * How much of the hourly request allowance is left — Accelo.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — "will the next hundred calls succeed", not "is the
 *     credential live" (the derived `auth:*` check).
 *   - `credential: "signed"` and `scope: "connection"` are this kind's defaults:
 *     the allowance belongs to the DEPLOYMENT (5000 requests/hour, per the API
 *     reference's "Rate Limiting"), and reading it needs the token on the wire.
 *     Signing is safe because the probe stays on the app's own allowlist.
 *   - `severity: "informational"` — running low is worth showing, never worth
 *     failing a verdict over.
 *
 * Probe: `GET /api/v0/tokeninfo`, the scope-free whoami the auth `test` uses.
 * The documented `X-RateLimit-Limit`, `X-RateLimit-Remaining` and
 * `X-RateLimit-Reset` headers (reset is a UNIX TIMESTAMP, not a delay) are read
 * off it. They were NOT present on the unauthenticated 401 probed live
 * 2026-10-06, and this app could not mint a token to confirm them on a signed
 * answer, so a response without them reports `unknown` rather than inventing a number.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { apiBase } from "../lib/client.ts";

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
  description:
    "Requests remaining in this deployment's hourly window (5000/hour), read off the `X-RateLimit-*` headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { deployment?: string };
    if (!display.deployment) {
      return { state: "unknown", message: "connection records no deployment" };
    }

    const res = await ctx.fetch(`${apiBase(display.deployment)}/tokeninfo`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    const reset = num(res.headers.get("x-ratelimit-reset"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no X-RateLimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "deployment",
        limit,
        remaining,
        resetAt: reset === undefined ? undefined : new Date(reset * 1000).toISOString(),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
