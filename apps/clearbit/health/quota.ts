/**
 * How much headroom is left on THIS credential — Clearbit.
 *
 * - `kind: "quota"` — a different question from liveness (the derived
 *   `auth:api-key` check) or platform status (`service`).
 * - `scope: "connection"` / `credential: "signed"` (defaults) — the allowance
 *   belongs to the credential, and reading it needs the credential on the
 *   wire. Signing is safe here because the probe stays on the app's own
 *   egress allowlist (`company.clearbit.com`) — this check declares no extra
 *   `network.allow` of its own.
 * - `severity: "informational"` — running low is worth showing and never
 *   worth failing a verdict over.
 *
 * Probe: the same free `GET /v1/domains/find?name=Clearbit` call the auth
 * `test` hook uses (see `auth/api-key.ts`) — it costs no enrichment credit,
 * so this check can run on a schedule without burning the very quota it
 * measures. Confirmed live 2026-08-01: an authenticated call to this endpoint
 * returns `x-ratelimit-limit`, `x-ratelimit-remaining` and `x-ratelimit-reset`
 * response headers, where `x-ratelimit-reset` is a **Unix epoch timestamp in
 * seconds** (verified by observing it equal the request's own wall-clock
 * time, unlike a countdown-style "seconds from now" header) — this is
 * Clearbit's per-key rate limit (documented historically as 600 req/min per
 * API family), not the separate, unmetered enrichment-credit balance that
 * HubSpot's Breeze Intelligence billing tracks; Clearbit publishes no header
 * or endpoint for the latter, so this check can only speak to request-rate
 * headroom, not credit balance.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { COMPANY_LOOKUP_HOST } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const isoFromEpochSeconds = (v: string | null): string | undefined => {
  const n = num(v);
  return n === undefined ? undefined : new Date(n * 1000).toISOString();
};

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
    "Requests remaining on this credential, read off the x-ratelimit-* headers of a free name-to-domain lookup.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${COMPANY_LOOKUP_HOST}/v1/domains/find?name=Clearbit`);
    // A 404 ("no domain found") still carries the rate-limit headers and still
    // proves the credential authenticated; only treat the probe as unusable
    // when it can't be read at all.
    if (!res.ok && res.status !== 404) {
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }

    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no x-ratelimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests",
        limit,
        remaining,
        resetAt: isoFromEpochSeconds(res.headers.get("x-ratelimit-reset")),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
