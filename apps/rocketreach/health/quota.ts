/**
 * How many credits are left?
 *
 * `GET /account/` (signed, on the app's own host) returns `credit_usage`: an ARRAY
 * of `{credit_type, allocated, used, remaining}` on standard plans. The Universal
 * account schema makes it an OBJECT `{credits_allocated, credits_used,
 * credits_remaining}`; both shapes are read, in case the same endpoint serves
 * both. `allocated` and `remaining` are the string `"inf"` when unlimited (the
 * schema says so), and such a pool is skipped, not read as zero.
 *
 * Each credit type is its own pool, so one exhausted pool (say, phone) degrades
 * the verdict; only every finite pool being exhausted is `down`. From 90% used a
 * pool is `degraded`. Rate-limit windows are in the same body but reset within
 * the hour, so they are not headroom and are left to Get Account.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const ACCOUNT_URL = `${API_BASE}/account/`;
export const WARN_FRACTION = 0.9;

interface Pool {
  id: string;
  limit: number;
  used: number;
}

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

export function readPools(body: unknown): Pool[] {
  const usage = (body as { credit_usage?: unknown } | null)?.credit_usage;
  const pools: Pool[] = [];
  if (Array.isArray(usage)) {
    for (const u of usage as Record<string, unknown>[]) {
      const limit = num(u?.allocated);
      const used = num(u?.used);
      if (limit === undefined || used === undefined) continue; // "inf" or malformed
      pools.push({ id: String(u.credit_type ?? "credits"), limit, used });
    }
  } else if (usage && typeof usage === "object") {
    const u = usage as Record<string, unknown>;
    const limit = num(u.credits_allocated);
    const used = num(u.credits_used);
    if (limit !== undefined && used !== undefined) pools.push({ id: "universal", limit, used });
  }
  return pools;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit headroom",
  description: "Credits used vs allocated per credit type, from GET /account/. A pool at 90% " +
    "degrades; every finite pool exhausted is down. Unlimited pools are skipped.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(ACCOUNT_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `GET /account/ answered HTTP ${res.status}` };
    const body = await res.json().catch(() => null);
    const pools = readPools(body);
    if (pools.length === 0) {
      return { state: "ok", message: "no finite credit pool reported", ttlSeconds: 300 };
    }
    const readings: HealthQuota[] = pools.map((p) => ({
      id: p.id,
      limit: p.limit,
      remaining: Math.max(0, p.limit - p.used),
      unit: "credits",
    }));
    const fractions = pools.map((p) => p.limit > 0 ? p.used / p.limit : 0);
    const metered = pools.filter((p) => p.limit > 0);
    let state: HealthState = "ok";
    if (metered.length > 0 && metered.every((p) => p.used >= p.limit)) state = "down";
    else if (fractions.some((f) => f >= WARN_FRACTION)) state = "degraded";
    const strained = pools
      .filter((p) => p.limit > 0 && p.used / p.limit >= WARN_FRACTION)
      .map((p) => `${p.id} ${p.used}/${p.limit}`);
    return {
      state,
      message: state === "ok" ? undefined : `credits strained: ${strained.join(", ")}`,
      quota: readings,
      ttlSeconds: 300,
    };
  },
};

export default quota;
