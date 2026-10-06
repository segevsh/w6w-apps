/**
 * How much of today's request quota is left?
 *
 * Every response from the API carries `quota_max` and `quota_remaining` on the wrapper object
 * (measured 2026-10-06: 300 / 296 unkeyed; a registered key's default is 10,000 per day, per the
 * throttle docs). `GET /info?site=stackoverflow` is the cheapest signed read that returns them. The
 * docs do not state a reset instant, so none is reported. Spent quota stops the app (the API
 * answers `throttle_violation`), so exhaustion is `down`; the last 10% is `degraded`.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, type Wrapper } from "../lib/client.ts";

/** Fraction of the daily quota at or above which usage is worth flagging. */
export const WARN_FRACTION = 0.9;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Daily request quota",
  description: "quota_remaining / quota_max from the wrapper object of a signed GET /info.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/info?site=stackoverflow`, {
      headers: { accept: "application/json" },
    });
    const raw = await res.text().catch(() => "");
    let body: Wrapper | null = null;
    try {
      body = raw ? JSON.parse(raw) as Wrapper : null;
    } catch { /* handled below */ }

    const limit = body?.quota_max;
    const remaining = body?.quota_remaining;
    if (!res.ok || typeof limit !== "number" || typeof remaining !== "number") {
      return {
        state: "unknown",
        message: `GET /info returned ${res.status} without quota counters`,
      };
    }

    const reading: HealthQuota = { id: "daily", limit, remaining, unit: "requests" };
    let state: HealthState = "ok";
    let message: string | undefined;
    if (limit > 0) {
      const used = limit - remaining;
      if (remaining <= 0) {
        state = "down";
        message = `daily quota exhausted (${used}/${limit} requests)`;
      } else if (used / limit >= WARN_FRACTION) {
        state = "degraded";
        message = `daily quota at ${used}/${limit} requests`;
      }
    }
    return { state, message, quota: [reading], ttlSeconds: 60 };
  },
};

export default quota;
