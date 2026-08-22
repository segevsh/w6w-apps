/**
 * How much of the rate limit is left — read if Mux says, reported honestly if
 * not.
 *
 * Mux meters per endpoint group rather than per account, and does not publish a
 * consumption endpoint. Measured 2026-08-18, an unauthenticated response
 * carries `x-request-id` and no `x-ratelimit-*` header — but Mux documents
 * rate-limit headers on authenticated responses, so this reads whatever
 * actually arrives rather than assuming either way.
 *
 * When nothing arrives it reports `unknown`, which is the correct answer rather
 * than a fault: it means Mux told us nothing, not that anything is wrong.
 *
 * The probe is `GET /video/v1/assets?limit=1` — the cheapest authenticated call,
 * and the same one the connection test uses.
 *
 * `severity: "informational"` because headroom is a capacity fact rather than
 * an outage.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { BASE_URL } from "../lib/client.ts";

/** Below this fraction of the allowance, say so. */
const LOW_WATER = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  description:
    "Whatever rate-limit headers Mux returns on an authenticated response. Reports `unknown` " +
    "when it sends none, which is an answer rather than a fault.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${BASE_URL}/video/v1/assets?limit=1`, {
      headers: { accept: "application/json" },
    });
    await res.body?.cancel();

    const num = (name: string): number | undefined => {
      const raw = res.headers.get(name);
      if (raw === null || raw.trim() === "") return undefined;
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    };
    const limit = num("x-ratelimit-limit");
    const remaining = num("x-ratelimit-remaining");
    const reset = num("x-ratelimit-reset");

    if (!res.ok && limit === undefined) {
      return { state: "unknown", message: `GET /video/v1/assets returned ${res.status}` };
    }
    if (limit === undefined || remaining === undefined) {
      return {
        state: "unknown",
        message: "Mux sent no rate-limit headers on this response — it meters per endpoint " +
          "group and publishes no usage endpoint",
      };
    }

    const quotas: HealthQuota[] = [{
      id: "requests",
      limit,
      remaining,
      unit: "requests",
      resetAt: reset === undefined ? undefined : new Date(reset * 1000).toISOString(),
    }];
    const message = `${remaining}/${limit} requests`;
    if (remaining <= 0 || remaining / Math.max(1, limit) < LOW_WATER) {
      return { state: "degraded", message: `running low — ${message}`, quota: quotas };
    }
    return { state: "ok", message, quota: quotas, ttlSeconds: 300 };
  },
};

export default quota;
