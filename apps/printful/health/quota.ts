/**
 * Rate-limit headroom — Printful.
 *
 * The API allows 120 calls per minute (higher on some accounts) and returns `X-RateLimit-Limit`,
 * `X-RateLimit-Remaining` and `X-RateLimit-Reset` on every response — measured 2026-10-06 on an
 * unauthenticated 401: `120`, `119`, `60`. `Reset` is the seconds until the window resets, so it
 * is turned into an absolute `resetAt` from the clock at probe time. Probe: signed `GET /stores`,
 * the same scope-free call the Auth `test` uses. Absence of the headers is `unknown`, never
 * guessed. `informational`: running low in a one-minute window is context, not a verdict.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
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
  description: "Calls remaining in the current 60-second window, read off the response headers.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/stores`, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `quota probe returned HTTP ${res.status}` };
    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    const reset = num(res.headers.get("x-ratelimit-reset"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no x-ratelimit-* headers" };
    }
    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests",
        limit,
        remaining,
        unit: "requests",
        ...(reset !== undefined
          ? { resetAt: new Date(Date.now() + reset * 1000).toISOString() }
          : {}),
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
