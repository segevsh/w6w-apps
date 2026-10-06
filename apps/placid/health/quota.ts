import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function headroom(remaining?: number, limit?: number): HealthState {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
}

/**
 * Placid documents 60 requests per minute and `X-RateLimit-Limit`, `X-RateLimit-Remaining` and
 * `X-RateLimit-Reset` (UTC epoch SECONDS, a timestamp, not a delay) on API responses. The
 * probe is a signed `GET /collections?per_page=1` (a one-row read), so it spends one request
 * of the window it reports. The credit balance has no endpoint, so only request rate is
 * covered. Not verified against a live token: with no header the check reports `unknown`.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Requests remaining in the current 1-minute window (60/minute), read from the " +
    "documented X-RateLimit-* response headers.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/collections?per_page=1`, {
      headers: { accept: "application/json" },
    });
    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    const reset = num(res.headers.get("x-ratelimit-reset"));
    if (remaining === undefined) {
      return {
        state: "unknown",
        message: `response carried no X-RateLimit-Remaining header (HTTP ${res.status})`,
      };
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
