/**
 * How much of today's API budget is left, per zone?
 *
 * Source: the Rate limiting page (2026-10-06). Every response carries
 * `X-Reader-Zone1-Limit`, `X-Reader-Zone2-Limit`, `X-Reader-Zone1-Usage`,
 * `X-Reader-Zone2-Usage` and `X-Reader-Limits-Reset-After` (seconds until the counter resets).
 * Zone 1 is reads, zone 2 is writes.
 *
 * **This check is not free.** The headers come only on a signed call, and any signed call
 * spends one zone-1 request — against a Pro default of 100 per day. It therefore polls at most
 * every 6 hours (about 4 of 100 requests) and is `informational`, so it never turns a working
 * Connection red. The unsigned refusal that `api` reads carries no usage headers (measured).
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, readZoneUsage } from "../lib/client.ts";

/** Remaining fraction at or below which a zone is flagged. */
export const WARN_REMAINING_FRACTION = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Daily API quota",
  description: "Zone 1 (read) and zone 2 (write) usage vs limit from the X-Reader-Zone* headers. " +
    "Polling spends one zone-1 request, so it runs at most every 6 hours.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 21600,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/user-info`, {
      headers: { accept: "application/json" },
    });
    await res.text().catch(() => "");
    if (!res.ok) {
      return { state: "unknown", message: `Inoreader returned ${res.status} for /user-info` };
    }
    const u = readZoneUsage(res.headers);
    const resetAt = u.resetAfterSeconds !== undefined
      ? new Date(Date.now() + u.resetAfterSeconds * 1000).toISOString()
      : undefined;

    const quotas: HealthQuota[] = [];
    const zone = (id: string, limit?: number, usage?: number) => {
      if (limit === undefined || usage === undefined) return;
      quotas.push({
        id,
        limit,
        remaining: Math.max(0, limit - usage),
        unit: "requests",
        ...(resetAt ? { resetAt } : {}),
      });
    };
    zone("zone1-reads", u.zone1Limit, u.zone1Usage);
    zone("zone2-writes", u.zone2Limit, u.zone2Usage);
    if (quotas.length === 0) {
      return { state: "unknown", message: "Response carried no X-Reader-Zone* headers" };
    }

    let state: HealthState = "ok";
    const notes: string[] = [];
    for (const q of quotas) {
      const remaining = q.remaining ?? 0;
      if (q.limit && remaining === 0) {
        state = "down";
        notes.push(`${q.id} is exhausted`);
      } else if (q.limit && remaining / q.limit <= WARN_REMAINING_FRACTION) {
        if (state !== "down") state = "degraded";
        notes.push(`${q.id}: ${remaining}/${q.limit} left`);
      }
    }
    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: quotas,
      ttlSeconds: 21600,
    };
  },
};

export default quota;
