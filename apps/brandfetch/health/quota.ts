/**
 * How many API credits are left this billing period?
 *
 * `GET /v2/viewer` returns `usage: { used, quota }` for the key. The vendor says
 * it is free ("never consume API credits") and that `used` is the exact count.
 * Signed (it needs the key), on the app's own host. It is the same endpoint the
 * Auth `test` probes, on purpose: the one free, credential-requiring read that
 * returns no credential material.
 *
 * A non-positive quota is "not metered", not "exhausted". At 100% the key stops
 * working until the period rolls over (`down`); from 90% it is `degraded`.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const VIEWER_URL = `${API_BASE}/v2/viewer`;
export const WARN_FRACTION = 0.9;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API credit headroom",
  description: "Credits used vs the plan allowance, from the free GET /v2/viewer.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(VIEWER_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `GET /v2/viewer answered HTTP ${res.status}` };
    const body = await res.json().catch(() => null) as
      | { usage?: { used?: number; quota?: number } }
      | null;
    const used = body?.usage?.used;
    const limit = body?.usage?.quota;
    if (typeof used !== "number" || typeof limit !== "number") {
      return { state: "unknown", message: "GET /v2/viewer carried no usage figures" };
    }
    const reading = {
      id: "api-credits",
      limit,
      remaining: Math.max(0, limit - used),
      unit: "credits",
    };
    if (limit <= 0) return { state: "ok", quota: [reading], ttlSeconds: 300 };
    const fraction = used / limit;
    const state: HealthState = fraction >= 1
      ? "down"
      : fraction >= WARN_FRACTION
      ? "degraded"
      : "ok";
    return {
      state,
      message: state === "ok"
        ? undefined
        : `${used}/${limit} credits used (${Math.round(fraction * 100)}%)`,
      quota: [reading],
      ttlSeconds: 300,
    };
  },
};

export default quota;
