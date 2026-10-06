/**
 * How many Tavily credits are left?
 *
 * `GET /usage` is the one place Tavily publishes headroom (it sends no
 * rate-limit headers that the spec documents). Two ceilings can stop a call
 * with the non-standard statuses 432 and 433:
 *
 *  - `account.plan_usage` / `account.plan_limit`: the plan's monthly credits;
 *  - `key.usage` / `key.limit`: a per-key cap; `limit` is `null` when unlimited,
 *    which is "no ceiling", not "no headroom".
 *
 * A non-positive or missing limit is never reported as exhausted. The same call
 * is the auth probe, so a 401 here is `unknown` (the credential check owns
 * that verdict), as is any failure to read the body.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const USAGE_URL = `${API_BASE}/usage`;
export const WARN_FRACTION = 0.9;

interface UsageBody {
  key?: { usage?: number | null; limit?: number | null };
  account?: {
    plan_usage?: number | null;
    plan_limit?: number | null;
    paygo_usage?: number | null;
    paygo_limit?: number | null;
  };
}

export function reading(
  id: string,
  used: number | null | undefined,
  limit: number | null | undefined,
  unit = "credits",
): { quota: HealthQuota; state: HealthState; note?: string } | undefined {
  if (typeof used !== "number" || typeof limit !== "number" || limit <= 0) return undefined;
  const quota: HealthQuota = { id, limit, remaining: Math.max(0, limit - used), unit };
  const fraction = used / limit;
  if (fraction >= 1) return { quota, state: "down", note: `${id} at ${used}/${limit} (100%)` };
  if (fraction >= WARN_FRACTION) {
    return {
      quota,
      state: "degraded",
      note: `${id} at ${used}/${limit} (${Math.round(fraction * 100)}%)`,
    };
  }
  return { quota, state: "ok" };
}

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit headroom",
  description: "Plan, pay-as-you-go and per-key credit consumption from GET /usage.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(USAGE_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Tavily returned ${res.status} for /usage` };

    const body = await res.json().catch(() => null) as UsageBody | null;
    if (!body || (!body.key && !body.account)) {
      return { state: "unknown", message: "Usage response carried no key or account" };
    }

    const readings = [
      reading("plan-credits", body.account?.plan_usage, body.account?.plan_limit),
      reading("paygo-credits", body.account?.paygo_usage, body.account?.paygo_limit),
      reading("key-credits", body.key?.usage, body.key?.limit),
    ].filter((r) => r !== undefined);

    if (readings.length === 0) {
      return { state: "unknown", message: "Usage response carried no credit limits" };
    }

    let state: HealthState = "ok";
    const notes: string[] = [];
    for (const r of readings) {
      if (RANK[r.state] > RANK[state]) state = r.state;
      if (r.note) notes.push(r.note);
    }
    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: readings.map((r) => r.quota),
      ttlSeconds: 60,
    };
  },
};

export default quota;
