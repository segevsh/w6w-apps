/**
 * How much of Float's per-minute rate-limit budget is left for this
 * connection?
 *
 * ## What Float actually documents
 *
 * `overview_authentication.html` states two independent ceilings for primary
 * data endpoints: 200 requests/minute (GET) / 100 requests/minute
 * (POST/PATCH/DELETE) per company, plus an undocumented-in-headers burst
 * floor of 10 requests/second (GET) / 4 requests/second (non-GET). Reports
 * endpoints (out of this app's scope) are capped at 30/minute.
 *
 * ## What is actually readable, measured live on 2026-09-15
 *
 * A signed `GET` to `api.float.com` answers with BOTH of these header
 * families, carrying the SAME numbers:
 *
 *   - `ratelimit-limit` / `ratelimit-remaining` / `ratelimit-reset` (IETF
 *     draft `RateLimit` header form; `reset` is seconds until the window
 *     rolls over)
 *   - `x-ratelimit-limit-minute` / `x-ratelimit-remaining-minute` (Float's
 *     own, older names for the identical per-minute meter)
 *
 * Only the per-minute GET ceiling is exposed this way. The stricter
 * per-second burst floor and the separate non-GET (100/min) ceiling carry no
 * header at all — Float's own docs say the only signal for either is the
 * `429` itself. This check reads the one meter that IS readable and says
 * nothing about the other two.
 *
 * ## Why `degraded`, never `down`, and why it recovers
 *
 * The per-minute window rolls over every 60 seconds by construction, so
 * running out is a queue, not an outage — capped at `degraded` rather than
 * `down` the way a monthly ceiling would be.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX, USER_AGENT } from "../lib/client.ts";

export const PROBE_PATH = "/departments";

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

function num(headers: Headers, name: string): number | undefined {
  const v = headers.get(name);
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "The per-minute GET request budget (200/min per company by default), read from the " +
    "`ratelimit-*` response headers on GET /v3/departments. Float's separate 100/min non-GET " +
    "ceiling and per-second burst floor carry no header and cannot be read in advance.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}?per-page=1`, {
      headers: { accept: "application/json", "user-agent": USER_AGENT },
    });
    if (!res.ok) {
      // A refused probe says nothing about headroom — `auth:api-token` covers
      // credential failure; this check stays `unknown` rather than guessing.
      return { state: "unknown", message: `Float returned ${res.status} for ${PROBE_PATH}` };
    }

    const limit = num(res.headers, "ratelimit-limit") ??
      num(res.headers, "x-ratelimit-limit-minute");
    const remaining = num(res.headers, "ratelimit-remaining") ??
      num(res.headers, "x-ratelimit-remaining-minute");
    const resetSeconds = num(res.headers, "ratelimit-reset");

    if (limit === undefined || remaining === undefined) {
      return {
        state: "unknown",
        message: "Response carried no ratelimit-limit/ratelimit-remaining headers",
      };
    }

    const resetAt = resetSeconds !== undefined
      ? new Date(Date.now() + resetSeconds * 1000).toISOString()
      : undefined;

    const used = Math.max(0, limit - remaining);
    const fraction = limit > 0 ? used / limit : 0;
    let state: HealthState = "ok";
    let message: string | undefined;
    if (fraction >= 1) {
      state = "degraded";
      message = `rate-limit exhausted (0/${limit} remaining this minute)`;
    } else if (fraction >= WARN_FRACTION) {
      state = "degraded";
      message = `${remaining}/${limit} requests remaining this minute (${
        Math.round(fraction * 100)
      }% used)`;
    }

    return {
      state,
      message,
      quota: [{ id: "requests-per-minute", limit, remaining, unit: "requests", resetAt }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
