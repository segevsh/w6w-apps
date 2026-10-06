/**
 * How much rate-limit headroom is left on THIS token — Rootly.
 *
 * Rootly meters 3,000 requests per 60 seconds and reports it on every response, observed
 * 2026-10-06: `x-ratelimit-limit: 3000, 3000;window=60` (a two-valued string, so it is read
 * with `parseInt`), `x-ratelimit-remaining`, `x-ratelimit-reset` (an absolute Unix epoch in
 * seconds) and `x-ratelimit-used`. Probe: the scope-free `GET /v1/users/me`, signed. Headers
 * absent -> `unknown`, never a guess.
 *
 * `severity: "informational"` — running low is worth showing, never worth failing a verdict.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL, CONTENT_TYPE } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = parseInt(v, 10);
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
  description: "Requests remaining in the current 60-second window, read off the response headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/v1/users/me`, { headers: { accept: CONTENT_TYPE } });
    if (!res.ok && res.status !== 403) {
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }
    const h = res.headers;
    const limit = num(h.get("x-ratelimit-limit"));
    const remaining = num(h.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no x-ratelimit-* headers" };
    }
    const reset = num(h.get("x-ratelimit-reset"));
    const bucket: HealthQuota = {
      id: "requests",
      limit,
      remaining,
      resetAt: reset === undefined ? undefined : new Date(reset * 1000).toISOString(),
      unit: "requests",
    };
    return { state: headroom(remaining, limit), quota: [bucket], ttlSeconds: 60 };
  },
};

export default quota;
