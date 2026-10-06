/**
 * Credit headroom, from the free `GET /account-information` (a signed call).
 *
 * Prospeo bills in credits, not requests, and this endpoint is documented as free, so the
 * probe spends nothing. `remaining_credits` of 0 is down (every paid call answers
 * INSUFFICIENT_CREDITS), under 10 is degraded. `informational`: running low is context for
 * a person, not a verdict on the vendor. The per-second/minute rate limits are not
 * reported: their headers (`x-minute-request-left` …) are documented only for enrich and
 * search responses, and this endpoint is outside both categories.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

export function headroom(remaining: number): HealthState {
  if (remaining <= 0) return "down";
  if (remaining < 10) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description:
    "Remaining credits and the next renewal, from a signed GET /account-information (free).",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/account-information`, {
      headers: { accept: "application/json" },
    });
    if (res.status === 429) return { state: "degraded", message: "rate limited" };
    const body = await res.json().catch(() => null) as
      | { error?: boolean; response?: Record<string, unknown> }
      | null;
    const info = body?.error === false ? body.response : undefined;
    const remaining = info?.remaining_credits;
    if (typeof remaining !== "number") {
      return { state: "unknown", message: `credit probe returned ${res.status} without a balance` };
    }
    const used = typeof info?.used_credits === "number" ? info.used_credits : undefined;
    const renewal = typeof info?.next_quota_renewal_date === "string"
      ? Date.parse(info.next_quota_renewal_date)
      : NaN;
    const bucket: HealthQuota = {
      id: "credits",
      remaining,
      limit: used === undefined ? undefined : remaining + used,
      resetAt: Number.isNaN(renewal) ? undefined : new Date(renewal).toISOString(),
      unit: "credits",
    };
    return { state: headroom(remaining), quota: [bucket], ttlSeconds: 300 };
  },
};

export default quota;
