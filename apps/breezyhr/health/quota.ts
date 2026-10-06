/**
 * Rate-limit headroom — Breezy HR.
 *
 * The API allows 100 requests per 60-second interval per token, and returns
 * `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` "on all requests"
 * (`developer.breezy.hr/reference/rate-limiting`). Probe: signed `GET /user`, the same
 * scope-free call the Auth `test` uses. The headers could not be observed live without a token,
 * so absence is reported as `unknown`, never guessed. `X-RateLimit-Reset` is documented only as
 * a "Timestamp" (epoch seconds or milliseconds unspecified), so it is not parsed into
 * `resetAt`. `informational`: running low in a one-minute window is context, not a verdict.
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
  description: "Requests remaining in the current 60-second window, read off the response headers.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/user`, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `quota probe returned HTTP ${res.status}` };
    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no x-ratelimit-* headers" };
    }
    return {
      state: headroom(remaining, limit),
      quota: [{ id: "requests", limit, remaining, unit: "requests" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
