/**
 * How much headroom is left on THIS credential — Pipedrive.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential, and reading
 *     it needs the credential on the wire. Signing is safe because the probe
 *     stays on the app's own egress allowlist — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over.
 *
 * Probe: `GET /users/me`, the same scope-free call the auth `test` hooks use.
 *
 * Pipedrive meters two windows at once, and both ride on the response headers
 * (verified against developers.pipedrive.com rate-limiting docs, 2026-07-27):
 *
 *   - a per-2-second BURST bucket — `x-ratelimit-limit` / `-remaining` /
 *     `-reset` (reset is seconds until the window rolls over);
 *   - a per-day TOKEN budget for write endpoints — `x-daily-requests-left`,
 *     which is the counter a bulk workflow actually exhausts (POST/PUT/DELETE
 *     draw from it; it is only populated for `api_token` auth). It carries a
 *     remaining count with no limit header, so `limit` is left undefined.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/** Worst of a set of states — inlined so this check imports no runtime value. */
const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };
const worst = (states: HealthState[]): HealthState =>
  states.reduce<HealthState>((w, s) => (RANK[s] > RANK[w] ? s : w), "ok");

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Reset is SECONDS FROM NOW. */
const isoFromDelta = (v: string | null): string | undefined => {
  const n = num(v);
  return n === undefined ? undefined : new Date(Date.now() + n * 1000).toISOString();
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a workflow is about to start getting 429s.
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
    "Per-2-second burst and daily token-budget allowances remaining, read off the `x-ratelimit-*` and `x-daily-requests-left` response headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const buckets: HealthQuota[] = [];
    const states: HealthState[] = [];

    const burstLimit = num(h.get("x-ratelimit-limit"));
    const burstRemaining = num(h.get("x-ratelimit-remaining"));
    if (burstRemaining !== undefined) {
      states.push(headroom(burstRemaining, burstLimit));
      buckets.push({
        id: "burst",
        limit: burstLimit,
        remaining: burstRemaining,
        resetAt: isoFromDelta(h.get("x-ratelimit-reset")),
        unit: "requests",
      });
    }

    // Only present for api_token auth; OAuth responses omit it. Absence is not an
    // error — the burst bucket still answers the question for OAuth callers.
    const dailyRemaining = num(h.get("x-daily-requests-left"));
    if (dailyRemaining !== undefined) {
      states.push(headroom(dailyRemaining));
      buckets.push({ id: "daily", remaining: dailyRemaining, unit: "requests" });
    }

    if (buckets.length === 0) {
      return {
        state: "unknown",
        message: "response carried no x-ratelimit-* or x-daily-requests-left headers",
      };
    }

    return { state: worst(states), quota: buckets, ttlSeconds: 60 };
  },
};

export default quota;
