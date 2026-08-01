/**
 * How much headroom is left on THIS connection — Xero.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:oauth2` check already answers "is the credential live"; this
 *     answers "will the next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance is per app-per-tenant, and
 *     reading it needs the credential (and the `Xero-tenant-id` header `sign`
 *     adds) on the wire. Signing is safe because the probe stays on the app's
 *     own egress allowlist (`api.xero.com`) — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /Organisation` — outside this app's action set (like Jira's
 * `/myself` and Salesforce's `/limits`), chosen because it is Xero's
 * lightest documented Accounting API read and needs no scope beyond
 * `accounting.settings`, which every connection already carries.
 *
 * Xero answers every Accounting API call with three rate-limit headers
 * (`X-MinLimit-Remaining`, `X-DayLimit-Remaining`, `X-AppMinLimit-Remaining`)
 * but no matching "-Limit" totals — the ceilings are fixed, documented
 * constants (60 calls/minute and 5,000/day per app-per-tenant, 10,000/minute
 * app-wide across all tenants), so they are hardcoded here rather than read
 * off a header that doesn't exist.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a bulk workflow is about to start getting 429s.
 */
const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Per-minute, per-day and app-wide allowances remaining, read off Xero's X-*Limit-Remaining headers on a GET /Organisation probe.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/Organisation`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const minuteRemaining = num(h.get("x-minlimit-remaining"));
    const dayRemaining = num(h.get("x-daylimit-remaining"));
    const appMinuteRemaining = num(h.get("x-appminlimit-remaining"));

    if (
      minuteRemaining === undefined && dayRemaining === undefined &&
      appMinuteRemaining === undefined
    ) {
      return { state: "unknown", message: "response carried no X-*Limit-Remaining headers" };
    }

    const buckets: HealthQuota[] = [
      { id: "minute", limit: 60, remaining: minuteRemaining, unit: "requests" },
      { id: "day", limit: 5000, remaining: dayRemaining, unit: "requests" },
      { id: "app-minute", limit: 10000, remaining: appMinuteRemaining, unit: "requests" },
    ];

    return {
      // Worst bucket wins. A per-minute dip recovers in seconds; a spent
      // daily allowance locks this connection out until the Xero day rolls
      // over, so it deserves the flag.
      state: worstHealthState([
        headroom(minuteRemaining, 60),
        headroom(dayRemaining, 5000),
        headroom(appMinuteRemaining, 10000),
      ]),
      quota: buckets,
      ttlSeconds: 60,
    };
  },
};

export default quota;
