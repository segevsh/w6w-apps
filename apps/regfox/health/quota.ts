import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

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
 * The reference documents a default of 10,000 requests per day (reset 00:00 UTC) with a burst
 * of 900 per 15 minutes, reported in `X-Daily-Limit` / `X-Daily-Remaining` and
 * `X-Burst-Limit` / `X-Burst-Remaining`. Unauthenticated responses carry `X-Burst-Limit: 0`, so
 * this reads a SIGNED `GET /forms?limit=1`, which spends one request of the day it reports.
 *
 * The reference's own example shows the `*-Reset` headers as a unix timestamp although its
 * table calls them "seconds left", so a value above 1e9 is read as a timestamp.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Requests remaining in the daily window, from the X-Daily-* response headers " +
    "(the burst window is reported alongside).",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/forms?limit=1`, {
      headers: { accept: "application/json" },
    });
    const dailyLimit = num(res.headers.get("x-daily-limit"));
    const dailyRemaining = num(res.headers.get("x-daily-remaining"));
    if (dailyRemaining === undefined) {
      return {
        state: "unknown",
        message: `response carried no X-Daily-Remaining header (HTTP ${res.status})`,
      };
    }
    const resetAt = (raw: number | undefined) =>
      raw === undefined
        ? undefined
        : new Date(raw > 1e9 ? raw * 1000 : Date.now() + raw * 1000).toISOString();
    const burstLimit = num(res.headers.get("x-burst-limit"));
    const burstRemaining = num(res.headers.get("x-burst-remaining"));
    const quotas = [{
      id: "daily",
      limit: dailyLimit,
      remaining: dailyRemaining,
      resetAt: resetAt(num(res.headers.get("x-daily-limit-reset"))),
      unit: "requests",
    }];
    if (burstRemaining !== undefined) {
      quotas.push({
        id: "burst",
        limit: burstLimit,
        remaining: burstRemaining,
        resetAt: resetAt(num(res.headers.get("x-burst-limit-reset"))),
        unit: "requests",
      });
    }
    const states = [headroom(dailyRemaining, dailyLimit)];
    if (burstRemaining !== undefined) states.push(headroom(burstRemaining, burstLimit));
    const state = states.includes("down")
      ? "down"
      : states.includes("degraded")
      ? "degraded"
      : "ok";
    return { state, quota: quotas, ttlSeconds: 900 };
  },
};

export default quota;
