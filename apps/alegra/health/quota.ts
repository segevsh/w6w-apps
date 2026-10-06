import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE, V1 } from "../lib/client.ts";

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
 * Alegra documents (Límite de request) 150 requests/minute per user and says every response
 * carries `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining` and `X-Rate-Limit-Reset` (seconds left
 * in the window — a DELAY, not a timestamp). The probe is a signed `GET /terms`
 * read (a tiny config list), so it spends one request of the window it reports.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Requests remaining in the current 1-minute window, read from the documented " +
    "X-Rate-Limit-* response headers (150 requests/minute per user).",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${V1}/terms`, {
      headers: { accept: "application/json" },
    });
    const limit = num(res.headers.get("x-rate-limit-limit"));
    const remaining = num(res.headers.get("x-rate-limit-remaining"));
    const reset = num(res.headers.get("x-rate-limit-reset"));
    if (remaining === undefined) {
      return {
        state: "unknown",
        message: `response carried no X-Rate-Limit-Remaining header (HTTP ${res.status})`,
      };
    }
    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests",
        limit,
        remaining,
        resetAt: reset !== undefined
          ? new Date(Date.now() + reset * 1000).toISOString()
          : undefined,
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
