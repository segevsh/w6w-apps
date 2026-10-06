import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/** Warn (degraded) once a metered dimension has less than this fraction left. */
export const LOW_FRACTION = 0.1;

interface Window {
  limit?: number;
  used?: number;
  remaining?: number;
  resetsAt?: string;
}

/**
 * Credit and rate-limit headroom from `GET /v3/account/usage` (`credits.total/used/remaining` and
 * `rateLimits.daily|hourly|minute` with `limit/used/remaining/resetsAt`). That endpoint is itself
 * limited to 5 requests per minute, hence the 120 s floor.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit and rate-limit headroom",
  description: "Remaining credits and the daily, hourly and per-minute request windows.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/v3/account/usage`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return { state: "unknown", message: `Lusha returned ${res.status} for /v3/account/usage` };
    }
    const body = await res.json().catch(() => null) as {
      credits?: { total?: number; remaining?: number };
      rateLimits?: Record<string, Window | undefined>;
    } | null;
    if (!body?.credits && !body?.rateLimits) {
      return { state: "unknown", message: "usage response carried no credits or rate limits" };
    }

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "ok";
    const read = (
      id: string,
      unit: string,
      limit?: number,
      remaining?: number,
      resetAt?: string,
    ) => {
      if (typeof limit !== "number" || typeof remaining !== "number") return;
      quotas.push({ id, unit, limit, remaining, ...(resetAt ? { resetAt } : {}) });
      if (limit > 0 && remaining / limit < LOW_FRACTION) {
        state = "degraded";
        notes.push(remaining <= 0 ? `${id} exhausted` : `${id} low: ${remaining}/${limit}`);
      }
    };
    read("credits", "credits", body.credits?.total, body.credits?.remaining);
    for (const name of ["daily", "hourly", "minute"]) {
      const w = body.rateLimits?.[name];
      read(`${name}-requests`, "requests", w?.limit, w?.remaining, w?.resetsAt);
    }
    if (quotas.length === 0) {
      return { state: "unknown", message: "usage response carried no readable dimension" };
    }
    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: quotas,
      ttlSeconds: 120,
    };
  },
};

export default quota;
