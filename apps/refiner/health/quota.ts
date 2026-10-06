import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

export const ACCOUNT_URL = `${API_BASE}${API_PREFIX}/account`;

/** Warn at this fraction of a plan ceiling. */
export const WARN_FRACTION = 0.9;

interface Subscription {
  plan?: string;
  [k: string]: unknown;
}

/**
 * The three metered dimensions that carry a `*_limit` in `GET /v1/account`
 * (`mte_count` has no limit field, so it is not a quota). All are monthly.
 */
export const QUOTA_DIMENSIONS = [
  { id: "monthly-tracked-users", countKey: "mtu_count", limitKey: "mtu_limit", unit: "users" },
  { id: "monthly-page-views", countKey: "mpv_count", limitKey: "mpv_limit", unit: "page views" },
  {
    id: "monthly-survey-responses",
    countKey: "msr_count",
    limitKey: "msr_limit",
    unit: "responses",
  },
] as const;

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  description:
    "Monthly tracked users, page views and survey responses against the plan ceilings, read " +
    "from GET /v1/account.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    const res = await ctx.fetch(ACCOUNT_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Refiner returned ${res.status} for /v1/account` };
    }
    const body = await res.json().catch(() => null) as { subscription?: Subscription } | null;
    const sub = body?.subscription;
    if (!sub || typeof sub !== "object") {
      return { state: "unknown", message: "Account response carried no subscription block" };
    }

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "ok";

    for (const d of QUOTA_DIMENSIONS) {
      const limit = sub[d.limitKey];
      const used = sub[d.countKey];
      if (typeof limit !== "number" || typeof used !== "number") continue;
      quotas.push({ id: d.id, limit, remaining: Math.max(0, limit - used), unit: d.unit });
      if (limit <= 0) continue;
      const fraction = used / limit;
      if (fraction >= WARN_FRACTION) {
        const next: HealthState = "degraded";
        notes.push(`${d.id} at ${used}/${limit} ${d.unit} (${Math.round(fraction * 100)}%)`);
        if (RANK[next] > RANK[state]) state = next;
      }
    }

    if (quotas.length === 0) {
      return { state: "unknown", message: "Account response carried no plan limits" };
    }
    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: quotas,
      ttlSeconds: 900,
    };
  },
};

export default quota;
