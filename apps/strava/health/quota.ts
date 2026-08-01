/**
 * How much headroom is left on THIS credential — Strava.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:oauth2` check answers "is the credential live"; this answers
 *     "will the next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the credential,
 *     and reading it needs the credential on the wire. Signing is safe
 *     because the probe stays on the app's own egress allowlist — this check
 *     declares no `network.allow` of its own, which the spec forbids
 *     alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /athlete` (the same call the auth `test` hook makes — the
 * cheapest authenticated read this app has). Strava's rate-limit headers are
 * unusual: `x-ratelimit-limit` / `x-ratelimit-usage` (and the read-only
 * variants `x-readratelimit-limit` / `x-readratelimit-usage`) each carry TWO
 * comma-separated values, 15-minute window first, then daily —
 * e.g. `X-Ratelimit-Limit: 600,30000` / `X-Ratelimit-Usage: 314,27536`.
 * Verified against https://developers.strava.com/docs/rate-limits/
 * (checked 2026-08-01). This check reports both windows as separate
 * components rather than folding them into one number, since either can be
 * the one that throttles the next call.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Parse Strava's `"15min,daily"` pair out of a rate-limit header. Returns
 * `undefined` for a header that isn't present or doesn't parse as two numbers.
 */
function parsePair(value: string | null): [number, number] | undefined {
  if (!value) return undefined;
  const parts = value.split(",").map((s) => Number(s.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return undefined;
  return [parts[0], parts[1]];
}

const headroom = (remaining: number, limit: number): HealthState => {
  if (remaining <= 0) return "down";
  if (limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "The 15-minute and daily windows off x-ratelimit-limit / x-ratelimit-usage, read from GET /athlete.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/athlete`);
    if (!res.ok && res.status !== 429) {
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }

    const limitPair = parsePair(res.headers.get("x-ratelimit-limit"));
    const usagePair = parsePair(res.headers.get("x-ratelimit-usage"));
    if (!limitPair || !usagePair) {
      return { state: "unknown", message: "response carried no x-ratelimit-* headers" };
    }

    const [limit15, limitDaily] = limitPair;
    const [used15, usedDaily] = usagePair;
    const remaining15 = limit15 - used15;
    const remainingDaily = limitDaily - usedDaily;

    const state15 = headroom(remaining15, limit15);
    const stateDaily = headroom(remainingDaily, limitDaily);

    const quotas: HealthQuota[] = [
      { id: "15min", limit: limit15, remaining: remaining15, unit: "requests/15min" },
      { id: "daily", limit: limitDaily, remaining: remainingDaily, unit: "requests/day" },
    ];

    return {
      state: worstHealthState([state15, stateDaily]),
      components: {
        "15min": { state: state15, message: `${remaining15}/${limit15} remaining` },
        daily: { state: stateDaily, message: `${remainingDaily}/${limitDaily} remaining` },
      },
      quota: quotas,
      ttlSeconds: 60,
    };
  },
};

export default quota;
