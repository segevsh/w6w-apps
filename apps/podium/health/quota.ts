import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Per-minute request headroom. Podium answers every call — including a 401 — with
 * `ratelimit-limit` / `ratelimit-remaining` / `ratelimit-reset` (the 300-per-minute window;
 * `ratelimit-reset` is seconds until the window resets) and with the long-form
 * `x-ratelimit-limit-minute` / `x-ratelimit-remaining-minute`. Measured 2026-10-06 on an
 * unauthenticated `GET /v4/contacts`: limit 300, remaining 299. There is also an `x-ratelimit-*`
 * set with a limit of 8000 and an epoch `reset`, which looks like a larger (hourly) window; this
 * check reports the tighter per-minute one.
 *
 * Probe: `GET /v4/webhooks` — the one list route that requires no OAuth scope, so the check
 * works with any grant. It is signed, so the call counts against this connection's own bucket.
 */
const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function headroom(remaining?: number, limit?: number): HealthState {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  description:
    "Requests remaining in the current one-minute window (300 per minute), read from the " +
    "`ratelimit-*` response headers of a signed, scope-free `GET /v4/webhooks`.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/webhooks`, {
      headers: { accept: "application/json" },
    });
    const limit = num(
      res.headers.get("ratelimit-limit") ?? res.headers.get("x-ratelimit-limit-minute"),
    );
    const remaining = num(
      res.headers.get("ratelimit-remaining") ?? res.headers.get("x-ratelimit-remaining-minute"),
    );
    const reset = num(res.headers.get("ratelimit-reset"));
    if (remaining === undefined) {
      return {
        state: "unknown",
        message: `response carried no rate-limit headers (HTTP ${res.status})`,
      };
    }
    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests-per-minute",
        limit,
        remaining,
        resetAt: reset !== undefined
          ? new Date(Date.now() + reset * 1000).toISOString()
          : undefined,
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
