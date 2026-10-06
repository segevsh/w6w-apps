/**
 * API-unit headroom — Ahrefs.
 *
 * `GET /subscription-info/limits-and-usage` is free and returns `limits_and_usage` with
 * `units_limit_api_key` / `units_usage_api_key` (per key; `units_limit_api_key` is null when the
 * key has no cap of its own), `units_limit_workspace` / `units_usage_workspace` (null when the
 * plan reports none) and `usage_reset_date`. The tighter applicable cap is reported. Shape taken
 * from the OpenAPI response schema; not observed live (no credential). `informational`: low
 * units are context for a workflow, not a verdict on the API. Unlimited/unknown is `unknown`.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

interface Usage {
  units_limit_api_key?: number | null;
  units_limit_workspace?: number | null;
  units_usage_api_key?: number | null;
  units_usage_workspace?: number | null;
  usage_reset_date?: string;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const headroom = (remaining: number, limit: number): HealthState => {
  if (remaining <= 0) return "down";
  return limit > 0 && remaining / limit < 0.1 ? "degraded" : "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API unit headroom",
  description: "Monthly API units remaining, from the free limits-and-usage call.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 600,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/subscription-info/limits-and-usage`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { state: "unknown", message: `quota probe returned HTTP ${res.status}` };
    const body = await res.json().catch(() => undefined) as
      | { limits_and_usage?: Usage }
      | undefined;
    const u = body?.limits_and_usage;
    if (!u) return { state: "unknown", message: "response carried no limits_and_usage" };

    const buckets: Array<{ id: string; limit: number; used: number }> = [];
    if (isNum(u.units_limit_api_key) && isNum(u.units_usage_api_key)) {
      buckets.push({ id: "api-key", limit: u.units_limit_api_key, used: u.units_usage_api_key });
    }
    if (isNum(u.units_limit_workspace) && isNum(u.units_usage_workspace)) {
      buckets.push({
        id: "workspace",
        limit: u.units_limit_workspace,
        used: u.units_usage_workspace,
      });
    }
    if (buckets.length === 0) {
      return { state: "unknown", message: "no unit limit reported (unlimited or not exposed)" };
    }
    const quotas = buckets.map((b) => ({
      id: b.id,
      limit: b.limit,
      remaining: Math.max(0, b.limit - b.used),
      unit: "units",
      ...(u.usage_reset_date && !Number.isNaN(Date.parse(u.usage_reset_date))
        ? { resetAt: new Date(u.usage_reset_date).toISOString() }
        : {}),
    }));
    const order: HealthState[] = ["ok", "degraded", "down"];
    const state = quotas.map((q) => headroom(q.remaining, q.limit))
      .reduce((a, b) => order.indexOf(b) > order.indexOf(a) ? b : a, "ok" as HealthState);
    return { state, quota: quotas, ttlSeconds: 300 };
  },
};

export default quota;
