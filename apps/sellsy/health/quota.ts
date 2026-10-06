import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Request-quota headroom. Sellsy meters requests per second, minute, day and
 * month and reports what is left on **every** response in
 * `X-Quota-Remaining-By-Second|Minute|Day|Month`; the limits themselves are in
 * `GET /quotas` (`api_rate_minutes: {limit, used}`, …, scope `accounts.read`).
 * This signed check reads both from the one `/quotas` call. Quotas are counted
 * per request even when it fails, so the call itself costs one unit.
 *
 * Informational: a low count is a busy account, not a broken one.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-quota headroom",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/quotas`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach api.sellsy.com: ${String(err)}` };
    }
    const body = await res.json().catch(() => null) as
      | Record<string, { limit?: number | null; used?: number } | undefined>
      | null;
    if (res.status === 403) {
      return { state: "unknown", message: "the client lacks `accounts.read`; quotas not readable" };
    }
    if (!res.ok) return { state: "unknown", message: `Sellsy answered ${res.status}` };

    const windows = [
      {
        id: "requests-per-second",
        header: "x-quota-remaining-by-second",
        field: "api_rate_seconds",
      },
      {
        id: "requests-per-minute",
        header: "x-quota-remaining-by-minute",
        field: "api_rate_minutes",
      },
      { id: "requests-per-day", header: "x-quota-remaining-by-day", field: "api_rate_days" },
      { id: "requests-per-month", header: "x-quota-remaining-by-month", field: "api_rate_months" },
    ];
    const quota = [];
    let worst = 1;
    for (const w of windows) {
      const raw = res.headers.get(w.header);
      const remaining = raw === null ? undefined : Number(raw);
      const limit = body?.[w.field]?.limit;
      if (remaining === undefined || !Number.isFinite(remaining)) continue;
      quota.push({
        id: w.id,
        remaining,
        limit: typeof limit === "number" ? limit : undefined,
        unit: "requests",
      });
      if (typeof limit === "number" && limit > 0) worst = Math.min(worst, remaining / limit);
    }
    if (quota.length === 0) {
      return { state: "unknown", message: "Sellsy sent no X-Quota-Remaining-By-* headers" };
    }
    const state: HealthState = worst < 0.05 ? "degraded" : "ok";
    return {
      state,
      message: quota.map((q) => `${q.id}: ${q.remaining}${q.limit ? ` of ${q.limit}` : ""}`)
        .join(", "),
      quota,
      ttlSeconds: 60,
    };
  },
};

export default quota;
